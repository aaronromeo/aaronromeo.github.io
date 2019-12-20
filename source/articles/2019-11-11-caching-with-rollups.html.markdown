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
When initially developing an new app or feature, most aggregations (eg. the number of read blog posts, the number of people attending an event, a user's progress through a learning module, etc.) that are displayed to users are generated on the fly. However, as an app gets more successful and throughput increases, these queries get more expensive. This post is about using a roll-up field to keep a Rails app (or any app for that matter) stay responsive while delivering this information.

### The ecosystem's perspective vs the individual resource's perspective
Using the common example of a blog, if might be useful to keep a tally of the number of articles that have comments. As the dataset being queried grows, it gets more expensive to running an aggregation like this on the fly. One way to offload the performance hit is to compute this data when it changes and then cache. While this can be done via Redis, for the sake of this post, the database layer will be used for caching.

If I was implementing this as cached data using the database, I would implement this either via a materialized view (assuming Postgres) or via a roll-up field. I published a [post](/2019/05/22/analysis-using-materialized-views-in-rails-and-postgresql) on using materialized views in Rails.

One of the limitations with materialized views is that it works well for a holistic view of the state of an application rather than an individual resource. However, what if we wanted to do something that changed often? For instance, say you are trying to compute the karma for a Reddit user. The karma for a user is influenced by their interactions with other users. If this was computed with a materialized view, the karma data for all users would get refreshed regardless of whether their interactions change. This is because a materialized view isn't bounded to a resource and the query is executed over all the data in the application. There are at least three downsides to this
* Running a materialized view over a large set of data uses a lot of memory and can result in OOM errors
* Refreshing a materialized view over a large set of data can be long-running and susceptible to rows being locked
* Regularly refreshing a materialized view results in database IO usage, requiring regular vacuuming of the database view table.

While there are ways of limiting the data used by a materialized view (e.g only aggregating data from the last year), it usually compromises the business requirements. An alternative approach is to use a JSON field on a resource to contain a summary of this data. Sticking with the Reddit example, a `user` instance might have a field named `rollup` which holds the following data.

```json
{
  'total_posts': 15,
  'total_comments_on_posts': 230,
  'total_comments_by_self': 30,
  'total_upvotes': 410
}
```

Once these are computed, the aggregate data can be returned with a single query to retrieve the `author` instance. If this paradigm is being used by a Rails app, the data for the tags used by an author can be `author.rollup['tags']`. Obviously, some of these basic examples don't apply to Rails due to (counter cache)[https://guides.rubyonrails.org/association_basics.html#options-for-belongs-to-counter-cache] helpers, but it's easy to see how this could be used in more complex examples.

### **Considerations**

This implementation implies storing data in multiple places. As in any implementation like this, cache counters can drift from the source of truth. Additionally, if an aggregate is a complex business rule (say a roll-up field was "total_karma") and the business rule changes, the associated aggregates needs to be updated.

### **Implementation**

The following is how I implemented this in Rails.

It consists of the following components

* A migration - Add the roll-up field
* A trigger - Something needs to refresh the rolled-up counts
* A job queue - Unless you can afford to update the data within the request/response cycle, this should be pushed to a background job
* A service or job to fetch and update the rolled-up data
* A way to use your content - e.g a A serializer

##### The migration
For the migration, add a `jsonb` column to the table representing the resource being aggregated. Whether or not a `jsonb` column is actually needed (vs a `json` or `text` column is dependent on whether this needs to be searched).
```ruby
# frozen_string_literal: true

class AddUserRollups < ActiveRecord::Migration
  def up
    add_column :users, :rollup, :jsonb
    change_column_default :users, :rollup, "{}"
  end

  def down
    remove_column :users, :rollup
  end
end
```
If this is being searched, it is worthwhile considering to add a `gin` index on the field.
```ruby
add_index(:users, :rollup, using: :gin, algorithm: :concurrently)
```

##### The trigger
The simplest way to do this (though not my preferred way), is to use model callbacks to refresh the resource on a change.
```ruby
class User < ActiveRecord::Base
  # logic not relevant to this example
  after_save :update_rollups
  after_destroy :update_rollups

  def refresh_rollups
  'total_posts': 15,
  'total_comments_on_posts': 230,
  'total_comments_by_self': 30,
  'total_upvotes': 410
  total_upvotes = user.votes.where(upvote: true).count
    total_upvotes = user.votes.where(upvote: true).count
  end

  def update_rollups
    return if changed.reject { |attr| ["rollup", "updated_at"].include?(attr) }.blank?

    update_column
  end
end
```



