---
title: Jest Snapshot testing within Rails Webpacker
date: 2017-11-12 20:44
category: Rails
tags: rails, jest, webpacker, reactjs
slug: jest-snapshots-with-webpacker
authors: Aaron Romeo
summary: Jest snapshot within Rails Webpacker

---

### Preable
Ah... The state of the Rails ecosystem couldn't be better for me. With the supplementing of the asset pipeline with [Webpacker](https://github.com/rails/webpacker) the world of Javascript development has joined nicely with the world of Rails development.
If you are like me and using ReactJS as your staple JS view layer, you probably know of the testing tool [Jest](https://facebook.github.io/jest/) also created by the smart people at Facebook. This short tutorial assumes you have Webpacker and ReactJS running to to help, and you get setup with Jest.
### Setup
1. Install your packages.
`yarn` or `npm` install the following packages
    * `jest` (the main testing library)
    * `babel-jest` (assuming you are using `babel`, this is the associated `jest` plugin)
    * `babel-preset-es2015` (Babel preset for all es2015 plugins)
    * `babel-preset-react` (Babel preset for react)
    * `react-test-renderer` (another FB testing tool which renders React components to pure Javascript objects)
`yarn` does a better job of managing your JS packages, so here you go...
```yarn add --dev jest babel-jest babel-preset-es2015 babel-preset-react react-test-renderer```
1. Add the `.baberc` file to your project root.
Till this point, your project has been happily using the `config/webpack/loaders/react.js` and `config/webpack/loaders/babel.js` to translate your ES6 JS back to the stoneage. With Jest, though, it needs a little something more.
This is what my `.babelrc` file looks like. Yours will be similar, but your `plugins` will be dependent on what you have installed in your `react.js` or `babel.js` files.
    ```
    {
      "presets": [
        "es2015",
        "react",
      ],
      "env": {
        "test": {
          "plugins": [
            "transform-function-bind",
            "transform-class-properties"
          ]
        }
      }
    }
    ```
1. Modify the `package.json` to include the Jest config. Here is what my diff looked like.
    ```
       "scripts": {
         "eslint": "eslint --ext .jsx --ext .js app/javascript/**"
    +  },
    +  "jest": {
    +    "roots": [
    +      "app/javascript"
    +    ],
    +    "moduleDirectories": [
    +      "<rootDir>/node_modules"
    +    ],
    +    "moduleFileExtensions": [
    +      "js",
    +      "jsx"
    +    ]
       }
     }
    ```
### An example
Say you have the files in your project to define the component `BlogExample`
* app/javascript/components/blog_example/index.js
    ```javascript
    import BlogExample from './blog_example'

    export default BlogExample
    ```
* app/javascript/components/blog_example/blog_example.js
    ```javascript
    import PropTypes from 'prop-types'
    import React, { Component } from 'react'

    class BlogExample extends Component {
      static propTypes = {
        contacts: PropTypes.arrayOf(
          PropTypes.shape({
            email: PropTypes.string,
            id: PropTypes.string.isRequired,
          }).isRequired
        ).isRequired,
        handleDeleteContact: PropTypes.func.isRequired,
      }

      constructor(props) {
        super(props)
        this.renderContacts = this.renderContacts.bind(this)
      }

      renderContacts() {
        return this.props.contacts.map(contact => (
          <li key={contact.id}>
           <a href="#" onClick={() => this.props.handleDeleteContact(contact)}>{contact.email}</a>
          </li>
        ))
      }

      render() {
        return (
          <div>
            { this.renderContacts() }
          </div>
        )
      }
    }

    export default BlogExample
    ```
You could then create the following base test case
* app/javascript/components/blog_example/\__tests__/blog_example.spec.jsx
    ```javascript
    import React from 'react'
    import renderer from 'react-test-renderer'
    import BlogExample from '../index'

    test('Renders contacts', () => {
      const component = renderer.create(
        <BlogExample
          contacts={[{
              email: 'jane@example.com',
              id: '1',
            }, {
              email: 'joe@example.com',
              id: '2',
            }]}
          handleDeleteContact={() => {}}
        />
      )
      const tree = component.toJSON()
      expect(tree).toMatchSnapshot()
    })
    ```
If you run this with `bin/yarn jest`, you should see the following output generated
```
 PASS  app/javascript/components/blog_example/__tests__/blog_example.spec.jsx
  ✓ Null Contacts (12ms)

 › 1 snapshot written.
Snapshot Summary
 › 1 snapshot written in 1 test suite.

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   1 added, 1 total
Time:        1.054s
```
After you have run this, you should see the file `app/javascript/components/blog_example/__tests__/__snapshots__/blog_example.spec.jsx.snap` also created.

Say you modify your code base with a change, for example
```jest
diff --git a/app/javascript/components/blog_example/blog_example.js b/app/javascript/components/blog_example/blog_example.js
index 1717dab..72bfa39 100644
--- a/app/javascript/components/blog_example/blog_example.js
+++ b/app/javascript/components/blog_example/blog_example.js
@@ -20,7 +20,7 @@ class BlogExample extends Component {
   renderContacts() {
     return this.props.contacts.map(contact => (
       <li key={contact.id}>
-       <a href="#" onClick={() => this.props.handleDeleteContact(contact)}>{contact.email}</a>
+        <a href="#" onClick={() => this.props.handleDeleteContact(contact)}>* {contact.email}</a>
       </li>
     ))
   }
```
This will result in a failing test when you run `bin/yarn jest`
```
yarn run v1.3.2
warning package.json: No license field
$ /Users/aromeo/workspace/addresser/node_modules/.bin/jest app/javascript/components/blog_example
 FAIL  app/javascript/components/blog_example/__tests__/blog_example.spec.jsx
  ✕ Renders contacts (19ms)

  ● Renders contacts

    expect(value).toMatchSnapshot()

    Received value does not match stored snapshot 1.

    - Snapshot
    + Received

    @@ -2,17 +2,19 @@
        <li>
          <a
            href="#"
            onClick={[Function]}
          >
    +       *
            jane@example.com
          </a>
        </li>
        <li>
          <a
            href="#"
            onClick={[Function]}
          >
    +       *
            joe@example.com
          </a>
        </li>
      </div>

      at Object.<anonymous> (app/javascript/components/blog_example/__tests__/blog_example.spec.jsx:19:16)
          at new Promise (<anonymous>)
          at <anonymous>
      at process._tickCallback (internal/process/next_tick.js:188:7)

 › 1 snapshot test failed.
Snapshot Summary
 › 1 snapshot test failed in 1 test suite. Inspect your code changes or run with `yarn run jest -- -u` to update them.

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   1 failed, 1 total
Time:        1.324s
Ran all test suites matching /app\/javascript\/components\/blog_example/i.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```
`bin/yarn jest -- -u` updates your snapshot.

### Gotchas
`yarn` doesn't verify that the version of `react-test-renderer` matches the version of `react` you have installed.
```
         "jest": "21.2.1",
    -    "react-test-renderer": "16.0.0",
    +    "react-test-renderer": "^15.5.4",
         "redux-devtools": "^3.4.0",
```
If they don't match, you'll get a nasty error... Like this one I got.
```
yarn run v1.3.2
warning package.json: No license field
$ /Users/aromeo/workspace/addresser/node_modules/.bin/jest app/javascript/components/blog_example
 FAIL  app/javascript/components/blog_example/__tests__/blog_example.spec.jsx
  ● Test suite failed to run

    TypeError: Cannot read property 'ReactCurrentOwner' of undefined

      at node_modules/react-test-renderer/cjs/react-test-renderer.development.js:77:40
      at Object.<anonymous> (node_modules/react-test-renderer/cjs/react-test-renderer.development.js:7639:5)
      at Object.<anonymous> (node_modules/react-test-renderer/index.js:6:20)
      at Object.<anonymous> (app/javascript/components/blog_example/__tests__/blog_example.spec.jsx:2:26)
          at Generator.next (<anonymous>)
          at new Promise (<anonymous>)
          at Generator.next (<anonymous>)
          at <anonymous>
      at process._tickCallback (internal/process/next_tick.js:188:7)

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        0.764s, estimated 1s
Ran all test suites matching /app\/javascript\/components\/blog_example/i.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```
