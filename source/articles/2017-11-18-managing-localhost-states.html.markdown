---

title: Managing localhost states
date: 2017-11-18 12:26 UTC
category: Rails
tags: localhost, cookies, rails, subdomains
authors: Aaron Romeo
summary: Namespacing localhost with subdomains
layout: post

---

When developing locally, it's pretty common to have a bunch of cookies that do not pertain to the application being currently run. This is because all your cookies in your local development tend to share the same namespace `localhost:{port}` (where `{port}` is whatever port your framework of choice has bound to).

To compartmentalize my localhost, I use the nifty trick of namespacing via subdomains. For example, say I'm working on the Rails application `my_awesome_app` running on the port `3000`, I would browse to `http://my_awesome_app.localhost:3000/` rather than `http://localhost:3000/`. This keeps my cookies on the `my_awesome_app.localhost:3000` subdomain.

If you're sharing cookies across a domain, then I guess that's another problem.
