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

I [posted](/2019/05/22/analysis-using-materialized-views-in-rails-and-postgresql) a while back about using materialized views. However, one of the limitations with materialized views is that work well for a holistic view of the state of an application rather than an individual element. Using the example of blog, if might be useful to keep a tally of the number of articles written by the authors. If this data needs to be cached, it could be done with a materialized view. However, what if we wanted to do something that changed more often than a blog post. Say, there was a need to count the number of comments on each post of an online newspaper. The way a materialized view would work is that this would need to be triggered to refresh on cycle or it would be triggered to refresh after a change. At the point that the view is requested to be refreshed, the query is executed over all the data in the application. While there are ways of limiting the data, it is possible that the query to generate the data can be long-running, susceptible to rows being locked or memory constraints.

An alternative approach is to use a JSON field on a resource to contain a summary of this data. Sticking with the blog example, an `author` instance might have a field named `rollup` which holds the following data.

```json
{
  'total_posts': 15,
  'tags': [
    'es6',
    'ruby',
    'rails'
  ],
  'total_comments_on_posts': 230
}
```

Once these are computed, the data can be returned with a single query to retrieve the `author`. Then if this is paradigm is being used by a Rails app, the data for the tags used by an author can be `author.rollup['tags']`. Obviously, some of these basic examples don't apply with Rails due to (counter cache)[https://guides.rubyonrails.org/association_basics.html#options-for-belongs-to-counter-cache] helpers, but it's easy to see how this could be used if it is important to tally the number of articles associated to each tag.

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



