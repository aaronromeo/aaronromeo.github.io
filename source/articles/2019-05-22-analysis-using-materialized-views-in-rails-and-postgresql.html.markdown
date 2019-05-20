---
title: Analysis - Using materialized views in Rails and PostgreSQL
date: 2019-05-22 00:00 UTC
category: Rails
tags: rails, scenic, postgres, postgresql
authors: Aaron Romeo
summary: Materialized views can simplify data storage, increase flexibility, simplify abstractions and increase performance for Rails/Postgres.
layout: post
---

Sometimes you get asked for a perfectly reasonable business request for a feature which sounds trivial. However, the simplicity of a request can often mask the complexity require to achieve the implementation as a result of the data modeling used to store the data. For example, the request might result in deduping a union join of multiple tables or it might require an unperformant query against a massive table. Part of the job of a software development architect is to allow product people to worry about the product while the architect worries about delivering the request.

At [Timecounts](https://www.timecounts.org), concurrent materialized views have proved to be incredibly helpful with generating and backfilling data. I achieved this using the [Scenic](https://github.com/scenic-views/scenic) gem developed by the [Thoughtbot](https://thoughtbot.com/blog/announcing-scenic--versioned-database-views-for-rails) team. This is the first of a two part blog post which will highlight the pros and cons of materialized views. This will give you some idea as to whether it will work for your use case.


## What are concurrent materialized views?

Feel free to skip this section if you know what I'm talking about...

A bit of history. DBAs and developers long had the ability to generate a [view](https://en.wikipedia.org/wiki/View_(SQL)). A view in its most basic form is essentially a query saved to the database which would generate some results when requested. While this was great to keep logic in a central place (you could have multiple codebases executing central logic), it sucked for performance. The workaround was sometimes to drop and then create a table with the results, a.k.a. caching the results in the database. For example, say you needed to run a report every Monday you could run a cron job which executed the view and saved the results as a table. This table could then be queried during the week until it was dropped and recreated the following week.

As of [Postgres 9.3](https://www.postgresql.org/docs/9.3/rules-materializedviews.html), the world was gifted with materialized views. These did the heavy lifting of dropping and creating a table with the results. Now your weekly cron job just needed to run a `REFRESH` command for your new data. No performance gains, but less boiler-plate coding. Refreshing the view resulted the view table being locked while the results were being refreshed (making the results inaccessible for a refresh).

Finally in Postgres 9.4, the materialized view was further improved allowing the data to be refreshed concurrently, i.e. without the table being locked. The refresh is not instant (in fact it is slower to refresh a view concurrently). However, the view's data is available during the refresh.

That's the back-story. Let's get into the analysis.


## Pros vs. Cons

Here are things to consider to help you decide if materialized views are right for you.

A good way of illustrating the power of materialized views is to show how it can be used with a feature which has default values set on multiple levels.

Let's say that in some alternate DC universe, there is an imaginary company named _AlwaysConnected_ which is a clone of the app _Slack_. It is possible in _AlwaysConnected_ for a user's notification preferences to be set at the following three cascading levels

1. At an application level (via the defaults the _AlwaysConnected_ developers might set for their user)
1. At an organization level (via what a user has set for each of the _AlwaysConnected_ organizations they are associated to)
1. At a channel level (for all the channels a user is in within an _AlwaysConnected_ organization)

Keep in mind that a user's settings for a channel supersede the settings for an organization which supersede the default app settings.


### Pro: Flexibility

A materialized view can be used to generate an user's final setting for a channel. This allows the flexibility of being able to change default settings at as product level without needing to backfill data. Additionally it makes it possible to create a new notification preference setting without worrying about a backfill.

A naive approach would be to create a setting for each permutation and pre-populate the results for each case. The downside to this is changing any preference or default results in a costly update. Chances are a change to defaults would require a data migration. Generally data migrations are more difficult to verify, harder to scale and expose an application to increased deadlocks.

Concurrent materialized views allow these preferences to be generated with the defaults inserted at the time of computation. Going back to the use case of _AlwaysConnected_, the default application level might be to immediately notify a user when a user messages a channel. This can easily be changed and almost instantly by changing the definition of the materialized view at an app level.

```sql

CREATE MATERIALIZED VIEW backfilled_notification_preferences AS
SELECT
    users.id AS user_id,
    'new_channel_message' AS notification_type,
    COALESCE(
        channel_user_notification_preferences.notification_frequency,
        organization_user_notification_preferences.notification_frequency,
        'immediately'
    ) AS notification_frequency,
    channels.id AS channel_id
FROM ...

```


### Pro: Simplify Data Complexity

When dealing with defaults and value overrides, a certain number of hoops need to be jumped through to keep the distinction of a default vs. user defined value. Say the developers of _AlwaysConnected_ decided to persist the default user notification preferences. In the event of the default value changing at an organizational level, there would need to be a way to differentiate between the saved default values vs the default overrides a user has set. This is often done via a flag indicating if the data is set is a default or override.

As is shown in the code snippet above, this is much easier with materialized views as the default data isn't persisted. It would be possible to store all user overrides in a table similar to the one below

```sql
CREATE TABLE user_notification_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type character varying NOT NULL,
    notification_frequency character varying NOT NULL,
    settable_id integer NOT NULL,
    settable_type character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);
```

In this case the `settable_type` is set to either `Channel` or `Organization` and the `settable_id` would be the `id` of entity depending on what user preference is set. If a setting doesn't exist for a level, the default setting for the next level is applied (i.e. if no channel setting override exists, the organization setting override is applied).


To expand on the earlier examples, a materialized view for the notification settings might look like the following snippet.

```sql

CREATE MATERIALIZED VIEW backfilled_notification_preferences AS
SELECT
    users.id AS user_id,
    'new_channel_message' AS notification_type,
    COALESCE(
        channel_user_notification_preferences.notification_frequency,
        organization_user_notification_preferences.notification_frequency,
        'immediately'
    ) AS notification_frequency,
    channels.id AS channel_id
FROM channels
JOIN users
ON (
  channels.organization_id = users.organization_id
)
JOIN organizations
ON (
  users.organization_id = organizations.id
)
LEFT JOIN user_notification_preferences AS channel_user_notification_preferences
ON (
    channel_user_notification_preferences.settable_id = channels.id
    AND channel_user_notification_preferences.settable_type = 'Channel'
    AND channel_user_notification_preferences.notification_type = 'new_channel_message'
    AND channel_user_notification_preferences.user_id = users.id
)
LEFT JOIN user_notification_preferences AS organization_user_notification_preferences
ON (
    organization_user_notification_preferences.settable_id = channels.organization_id
    AND organization_user_notification_preferences.settable_type = 'Organization'
    AND organization_user_notification_preferences.notification_type = 'new_channel_message'
    AND organization_user_notification_preferences.user_id = users.id
)
UNION ALL
...

```

### Pro: Increased performance

We haven't explicitly touched on when the data would refresh in this use case. It would make sense for _AlwaysConnected_ to concurrently refresh their materialized view because there is no saying when a new alert would go out. Without a concurrent refresh of the data, the lookup of the user's notification preferences could end up blocking while the view is being reset. The data can be refreshed when the user


while refreshing


### Pro: Simplify Abstractions



* Default settings by joining views
* Determining alerts by joining views


### Con: The plumbing

* Tools: The job queue, Postgres and Scenic
* Rails 4 or greater
* Postgres 9.4. or greater


### Con: The delay in data population

* Accessing data before the refresh

### Con: Database performance


### Con: View requires a unique index

## Next up

I am working on a [post](/2019/06/10/tutorial-using-materialized-views-in-rails-and-postgresql) diving into an example of a Rails app using materialized view. Check it out over the next few weeks.

