# Jest Snapshot testing within Rails Webpacker
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

### Gotchas
```
         "jest": "21.2.1",
    -    "react-test-renderer": "16.0.0",
    +    "react-test-renderer": "^15.5.4",
         "redux-devtools": "^3.4.0",
```