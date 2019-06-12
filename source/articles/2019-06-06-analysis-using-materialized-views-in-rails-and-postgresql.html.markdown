---

title: Analysis – Using materialized views in Rails and PostgreSQL
date: 2019-06-06 00:00 UTC
category: Rails
tags: rails, scenic, postgres, postgresql
authors: Aaron Romeo
summary: Materialized views can simplify data storage, increase flexibility, simplify abstractions and increase performance for Rails/Postgres.
layout: post

---

Sometimes you get asked for a perfectly reasonable feature. It might sound trivial on the surface. However, the simplicity of a request can often mask the complexity required to achieve the implementation. Often, this complexity is a result of the data modelling used to _store_ the data vs. the data modelling required to _analyze_ the data. For example, the request might result in deduping a union join of multiple tables, or it might require improving a poorly performing query. Part of the job of a software architect is to allow product people to worry about the product while the architect worries about delivering the product.

At [Timecounts](https://www.timecounts.org/), concurrent materialized views have proved to be incredibly helpful with generating and backfilling data. I achieved this using the [Scenic gem](https://github.com/scenic-views/scenic) developed by the [Thoughtbot](https://thoughtbot.com/blog/announcing-scenic--versioned-database-views-for-rails) team. This blog post highlights the pros and cons of materialized views. The goal is to give you an idea of whether it is useful for your use case.


### **What are concurrent materialized views?**

_Feel free to skip this section if you know what I’m talking about…_

A bit of history. DBAs and developers have been able to generate a [view](https://en.wikipedia.org/wiki/View_(SQL)) for a long, long time. A view in its most basic form is essentially a query saved to the database, which will generate some results when requested. While this was great to keep logic in a central place (you could have multiple codebases executing central logic), it sucked for performance. The workaround was sometimes to drop and then create a table with the results, essentially caching the results in the database. For example, say you needed to run a report every Monday: you could run a cron job that executed the view and saved the results as a table. This table could then be queried during the week until it was dropped and recreated the following week.

With the launch of [Postgres 9.3](https://www.postgresql.org/docs/9.3/rules-materializedviews.html), the world was gifted materialized views. These did the heavy lifting of dropping and creating a table containing the results. Now your weekly cron job just needed to run a `REFRESH` command for your new data. There were no performance gains yet, but less boiler-plate coding. Refreshing the view resulted in locking the view table while the results were being refreshed (making the results inaccessible for a refresh).

Finally, in Postgres 9.4, the materialized view was further improved, allowing the data to be refreshed concurrently, i.e. without locking the table. The refresh is not instant (in fact it is slower to refresh a view concurrently). However, the view’s data is available during the refresh.

Now you know the back-story. Let’s get into the analysis and figure out if this baby is right for you.


### **Pros vs. cons**

Here are things to consider to help you decide if materialized views are right for you.

A useful way to illustrate the power of materialized views is to demonstrate them via a sample feature that has default values and override values set on multiple levels.

Let’s say that in some alternate DC universe there is an imaginary company named _AlwaysConnected_. _AlwaysConnected_ is a clone of the app _Slack_. It is possible in _AlwaysConnected_ to set a user’s notification preferences at the following three cascading levels:



1. At an application level (via the defaults the _AlwaysConnected_ developers might set for their user)
2. At an organization level (via what a user has set for each of the _AlwaysConnected_ organizations they are associated with)
3. At a channel level (for all the channels a user is in within an _AlwaysConnected_ organization)

Keep in mind that a user’s settings for a channel supersede the settings for an organization, which supersede the default application settings.


#### **Pro: Flexibility**

In our example of _AlwaysConnected_, the default app alert for a new channel message is to notify a user only on the desktop. A user named John has set his organization’s preferences to include both desktop and mobile. Within his organization, John has two channels, _dev-notifications_ and _notifications_. John has muted new messages in _dev-notifications_ while he wants new messages in _notifications_ to alert him on both desktop and mobile.

A naive approach would be to create a setting for each permutation and pre-populate the results for each case. The downside to this is that changing any preference or default results in a costly update. Chances are a change to defaults would require a data migration. Generally, data migrations are more challenging to verify, harder to scale, and expose an application to increased deadlocks.

A materialized view can be used to generate the final notification setting for a channel. Creating the final notification values can be done using constants in the view’s definition. Using constants negates the need for a data backfill. The use of constants creates flexibility, allowing for instant modifications of default settings at a product level.

For example, _AlwaysConnected_ can choose to modify the default alert for new channel messages to notify a user on mobile. All this would entail is redefining the view.

Additionally, _AlwaysConnected_ might decide to create a new alert for new members joining an organization. Views make it possible to create a new notification preference setting without worrying about a backfill.


```sql
CREATE MATERIALIZED VIEW backfilled_notification_preferences AS
SELECT
    users.id AS user_id,
    'new_channel_message' AS notification_type,
    COALESCE(
        channel_user_notification_preferences.notification_frequency,
        organization_user_notification_preferences.notification_frequency,
        'desktop'
    ) AS notification_frequency,
    channels.id AS channel_id
FROM ...
```



#### **Pro: Reduces data complexity**

When dealing with defaults and value overrides, some hoops need to be jumped through to retain the distinction of default vs. user-defined value. Say the developers of _AlwaysConnected_ decided to persist the default user notification preferences. In the event of the default value changing at an organizational level, there would need to be a way to differentiate between the saved default values vs. the default overrides a user has set. If generating the notification data for a channel via a backfill, default values might be indicated via a flag.

As is shown in the code snippet above, this is much easier with materialized views as the default data isn’t persisted. It would be possible to store all user overrides in a table similar to the one below


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


In this case, the `settable_type` is set to either `Channel` or `Organization`  , and the `settable_id` would be the `id` of the entity depending on what user preference is set. If a setting doesn’t exist for a level, the default setting for the next level is applied (i.e., if no channel setting override exists, the organization setting override is applied).

To expand on the earlier examples, a materialized view for the notification settings might look like the following snippet.


```sql
CREATE MATERIALIZED VIEW backfilled_notification_preferences AS
SELECT
    users.id AS user_id,
    'new_channel_message' AS notification_type,
    COALESCE(
        cu_notification_preferences.notification_frequency,
        ou_notification_preferences.notification_frequency,
        'desktop'
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
LEFT JOIN user_notification_preferences AS cu_notification_preferences
ON (
    cu_notification_preferences.settable_id = channels.id
    AND cu_notification_preferences.settable_type = 'Channel'
    AND cu_notification_preferences.notification_type = 'new_channel_message'
    AND cu_notification_preferences.user_id = users.id
)
LEFT JOIN user_notification_preferences AS ou_notification_preferences
ON (
    ou_notification_preferences.settable_id = channels.organization_id
    AND ou_notification_preferences.settable_type = 'Organization'
    AND ou_notification_preferences.notification_type = 'new_channel_message'
    AND ou_notification_preferences.user_id = users.id
)
UNION ALL
...
```



#### **Pro: Increased performance**

I haven’t explicitly touched on when the data would refresh in this use case. It would make sense for _AlwaysConnected_ to concurrently refresh its materialized view because there is no saying when a new alert would go out. Without a concurrent refresh of the data, the lookup of the user’s notification preferences could end up blocking read requests while the view is being refreshed. Since the view data is dependent on data defined by other models (like the user’s notification preferences for the `Channel` or `Organization`), the view’s data can refresh when the user’s notification preferences are updated. It is also possible to have the materialized data refresh every few seconds or minutes based on the use case.

One of the things I like doing (depending on the use case) is having the view queue a refresh upon completion of a refresh. For example, using the Delayed Job and Scenic (more on them later), I re-queue the refresh from the `success`method of the job:


```ruby
class RefreshViewJob
  # ... code outside the scope of this use case
  def success(*)
    Delayed::Job.enqueue payload_object: RefreshViewJob.new, run_at: 5.minutes.from_now
  end
  # ... code outside the scope of this use case
end
```


Once the view data has been refreshed, the performance of read requests is no different than reads from any other table. Additionally, it is possible to add indexes to columns within the view. For instance, say you want to look up a `notification frequency` by the `user` and `notification_type`, the following index might make sense.


```sql
CREATE INDEX backfilled_notification_preferences_lookup
          ON public.backfilled_notification_preferences
       USING btree (user_id, notification_type);
```



#### **Pro: Simplifies abstractions**


_You want everyone to be able to look at the data and make sense out of it. It should be a value everyone has at your company, especially people interfacing directly with customers. There shouldn’t be any silos where engineers translate the data before handing it over to sales or customer service. That wastes precious time._


– Ben Porterfield, Founder and VP of Engineering at Looker

Think back to the times you have seen logic that pulls together bits of data, manipulates them and then formats them on the fly. Often this is done over multiple objects and functions, leaving a future developer with a nightmare of troubleshooting. I could rant about this forever, but I’m a firm believer that the best developers are developers who create readable code. Code with high cyclomatic complexity is generally more indicative of poor coding than high developer intelligence.

As a result, this is an area where views shine. The data that is gathered and displayed in a view is generally considered more readable and concise. In the case of the `backfilled_notification_preferences`, the data for a user might look like the following.


<table>
  <tr>
   <td><strong>user_id</strong>
   </td>
   <td><strong>notification_type</strong>
   </td>
   <td><strong>notification_frequency</strong>
   </td>
   <td><strong>settable_id</strong>
   </td>
   <td><strong>settable_type</strong>
   </td>
  </tr>
  <tr>
   <td>16914
   </td>
   <td><code>new_channel_message</code>
   </td>
   <td><code>desktop_and_mobile</code>
   </td>
   <td>519
   </td>
   <td>Channel
   </td>
  </tr>
  <tr>
   <td>16914
   </td>
   <td><code>new_channel_message</code>
   </td>
   <td><code>desktop</code>
   </td>
   <td>692
   </td>
   <td>Channel
   </td>
  </tr>
  <tr>
   <td>16914
   </td>
   <td><code>new_channel_message</code>
   </td>
   <td><code>desktop</code>
   </td>
   <td>5455
   </td>
   <td>Channel
   </td>
  </tr>
  <tr>
   <td>16914
   </td>
   <td><code>new_channel_message</code>
   </td>
   <td><code>never</code>
   </td>
   <td>405
   </td>
   <td>Channel
   </td>
  </tr>
  <tr>
   <td>16914
   </td>
   <td><code>new_user_message</code>
   </td>
   <td><code>desktop</code>
   </td>
   <td>1
   </td>
   <td>Organization
   </td>
  </tr>
</table>


The result is considerably more readable to someone troubleshooting a problem rather than hunting down the default and override values for each level of the notification hierarchy.

Furthermore, it is now possible to determine a user’s alert preferences using a trivial join to either the `Channel` or `Organization` object depending on the use case.


#### **Con: Setup complexity**

As is pretty evident by now, setting up materialized views can require a decent amount of overhead plumbing. While the refresh can be handled with database triggers, this might clash with an ORM that you are using. For instance, adding database triggers to a Rails app relying on RSpec tests limits testability for two reasons: the trigger requires a transaction to be committed, and it limits the stubbing of data. As a result, my project requires a few prerequisites:



*   A job queue (using [Delayed Job](https://github.com/collectiveidea/delayed_job)) – Refreshing a view within the request-response cycle would negate many of the performance gains. As a result, I am refreshing the view in the background.
*   An ORM view manager (using [Scenic](https://github.com/scenic-views/scenic)) – Ideally you want a tool that abstracts away much if the migration and ORM tie-ins.
*   Postgres 9.4. or greater


#### **Con: Delay in data population**

Unfortunately, data doesn’t populate instantly into the materialized view. How long this takes depends on the complexity of the query and the amount of data. My point is that if you need your data to always be immediate and accurate without a lag, this might not work for your use case. However, in many cases, the need for instant data can be mitigated by explaining to the end-user that their change might take a few minutes to propagate.


#### **Con: Database performance**

Running a query uses database computing cycles. The load on the database can be reduced by increasing the time between view refreshes. Alternatively, you can chuck gold bars at it and get a more powerful DB. More complex solutions might involve sharding data or creating read-replicas; however, this adds additional lag to the delay in data population.


#### **Con: View requires a unique index**

Last but not least, concurrent materialized views require a unique index for concurrent refreshes. This can be a combination of fields (like the following) if you don’t have a field like an `id`.


```sql
CREATE UNIQUE INDEX backfilled_notification_preferences_uniq
                 ON public.backfilled_notification_preferences
              USING btree (user_id, notification_type, settable_id, settable_type);
```


However, nothing is stopping you from constructing an ID based on a combination of fields that you know to be unique…


```sql
SELECT concat(table01.id, ':', table02.id, ':', table03.id) AS id
    ...
```



### **Wrap up**

To recap, materialized views can make sense depending on the use case. They often provide additional flexibility without committing to data that could otherwise be represented as constants. Additionally, I personally love the advantages of reducing data complexity, simplifying abstractions and increasing performance (mostly by caching a represented state).

As is often the case, it is the negative aspects of a feature that limit the use cases. Setup complexity might seem hefty, but it is often a one-time setup fee. Database performance can also be optimized for in most cases at a low cost. The largest limiting factor is often the delay in data population. An example of where this might prevent the use of materialized views is when it is used to represent user permissions as those have to be timely (especially when revoking). Similarly, other timely applications, like the representation of a score or stock price, might negate the usefulness of this approach.

If you made it this far, thank you very much. I’d love feedback. How can this be improved? Are there areas where you would have liked more information? Is there anything else?

I am working on a post diving into an example of a Rails app using a materialized view. Check it out over the next few weeks.
