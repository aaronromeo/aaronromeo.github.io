---

title: Caching with Roll-ups
date: 2019-11-11 00:00 UTC
category: Rails
tags: rails
authors: Aaron Romeo
summary: Performance optimizing a Rails app with roll-ups
layout: post
published: false

---
When initially developing an low-traffic app or new feature, most aggregates (eg. the number of read blog posts, the number of people attending an event, a user's progress through a learning module, etc.) that are displayed to users are generated on the fly. However, as an app gets more successful and throughput increases, these queries get more expensive. This post is about using a roll-up field to keep a Rails app (or any app for that matter) stay responsive while delivering this information.

### The ecosystem's perspective vs the individual resource's perspective
Using the example of blog, if might be useful to keep a tally of the number of articles that have comments. If I was implementing this as cached data using the database, I would implement this via a materialized view (assuming Postgres) or via a roll-up field. I published a [post](/2019/05/22/analysis-using-materialized-views-in-rails-and-postgresql) on using materialized views in Rails. However, one of the limitations with materialized views is that it works well for a holistic view of the state of an application rather than an individual resource.

However, what if we wanted to do something that changed often? For instance, say you are trying to compute the karma for a Reddit user. The karma for a user is influenced by their interactions with other users. If this was computed with a materialized view, the karma data for all users would get refreshed regardless of whether their interactions change. This is because a materialized view isn't bounded to a resource and the query is executed over all the data in the application. There are at least three downsides to this
* Running a materialized view over a large set of data uses a lot of memory and can result in OOM errors
* Refreshing a materialized view over a large set of data can be long-running and susceptible to rows being locked or memory constraints
* Regularly refreshing a materialized view results in DB data being rewritten often, requiring regular vacuuming of the DB table.

While there are ways of limiting the data used by a materialized view (e.g only data from the last year), it usually compromises the business requirements. An alternative approach is to use a JSON field on a resource to contain a summary of this data. Sticking with the Reddit example, a `user` instance might have a field named `rollup` which holds the following data.

```json
{
  'total_posts': 15,
  'total_comments_on_posts': 230
  'total_comments_by_self': 30
}
```

Once these are computed, the aggregate data can be returned with a single query to retrieve the `author`. Then if this is paradigm is being used by a Rails app, the data for the tags used by an author can be `author.rollup['tags']`. Obviously, some of these basic examples don't apply with Rails due to (counter cache)[https://guides.rubyonrails.org/association_basics.html#options-for-belongs-to-counter-cache] helpers, but it's easy to see how this could be used if it is important to tally the number of articles associated to each tag.

If the state changes for any of the instances which influence this count (e.g. the author publishes a new post), these fields can be updated.

### **Considerations**

This implementation implies storing data in multiple places. As in any implementation like this, cache counters can drift from the source of truth. Additionally, say the criteria is a vague business rule requirement like "recent posts". In an example like this, the criteria to generate the roll-up values can change if the business rules of "recent" change.

### **Implementation**

The following is how I implemented this in Rails.

It consists of the following components

* A migration - Add the roll-up field
* A trigger - Something needs to refresh the rolled-up counts
* A job queue - Unless you can afford to update the data within the request/response cycle, this should be pushed to a background job
* A service or job to fetch and update the rolled-up data



