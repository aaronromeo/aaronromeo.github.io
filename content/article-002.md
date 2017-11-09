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
1. 