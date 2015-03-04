# RestrictedStore
-------
> ...if you need data models for business logic and their independent projections for displaying.

JavaScript library that allows to get clones of plain JavaScript objects (JSON like object), which are bound to the model via 1-way data binding. Thus, changes in the model are reflected in its clone, but changes in the clone are not reflected in the model.

It is possible to create and track `strong` and `weak` clones:

* `strong` - the clone has the form and structure of the source data model.
* `weak`  - the clone contains the same data as the model does; but it can have another structure. For example, the array can be sorted in a different way or contain additional elements. If the clone is the object, it can contain additional attributes.

It is also possible to send a notification via callback, into which comes the unchangeable projection of the model.

##Dependencies
`Object.observe` is used as the basis for functioning. That is why in case of need it is possible to use any polyfill that contains `Object.observe` and `Array.observe`.

##Idea
Any module of your app can get the data from the model (projection or an interactive clone) and track its changes via `modelID`. But it is possible to change the model only with the module that wrapped the model in **Store**.

This brings several limitations to the application architecture, which lead to **single direction data flow** (like *Flux*).

##Use

###model
Any plain JavaScript object that does not contain methods. For example:

```javascript
// module 1
model = { attr: 1,
			array: [ 1, 2, {'new': 'new'}],
			obj: {attr: 'a'}
        };
```

###wrap
```javascript
// module 1
var store = require("{{..}}/restrictedstore").Store;

store.wrap('myModel', model, [options]);
```
You can set the model `state` via `options`. For example, if you want to get a notification from the model only after the promise is executed.

```javascript
store.wrap('myModel', model, {state: 'pending'});
```

###getProjection
Restores the `projection` of a selected model at a given time. Further changes of the model are not reflected in `projection`.
 
```javascript
// other module
var projection = store.getProjection('myModel');
```
###observe
Sets up an observer for the model. Restores the `projection` of the model or `strong`/`weak` reflection, depending on the indicated options:

```javascript
// other module
function observer(object, changes, state) {
	// object === mirror if we used 'mirror: true'
	// in other case object === new_projection
	
	// changes - changes in model
	
	// state - datamodel state 'valid' or 'invalid'
}

var mirror = store.observe('myModel', observer, options);
``` 
**observer** - callback function.

**options:**

* `mirror`: **true**/**false**. By default is **false**. Whether to create an interactive clone (mirror) or note.
* `weak`: **true**/**false**. By default is **true**. Whether to create a `weak` clone or not.

###unobserve
Frees the listener; if an interactive clone was created - it is freed but not eliminated.

```javascript
// other module
store.unobserve('myModel', observer);
``` 

###change
Changes the model object, registered under a certain `ID`, to a new one. Thus it basically changes the data model and notifies listeners of the changes:

```javascript
//module 1

store.change('myModel', {attr: 'new'});
```

###unwrap
Deletes the registration of the data model and restores it:

```javascript
//module 1

store.unwrap('myModel');
```

###clear
Clears up all the registered objects in `Store` and restores the array of models:

```javascript
//module 1

store.unwrap('myModel');
```

###getModelState
Restores `state` of the model; it can take such values as **valid**, **invalid** and **pending**. 
Notifications about a change of the model are executed only in valid and invalid state.

```javascript
var state = store.getModelState('myModel');
```
>Take notice that the state of the model is changed automatically via promises, which are generated with `createPromise` method.

>When the state is **invalid**, the observer is notified without any changes of data in the model.

###createPromise
Returns the `promise` object, which is bound to the current model. While creating a `promise`, the model receives the pending status, and model listeners are not notified about the change. After the promise is executed, depending on the result, the model receives either **valid** (`resolve`), or **invalid** (`reject`) state.

```javascript
function executor(resolve, reject) {
            setTimeout(function () {
                resolve('value');
            }, 100);
        }
        
var promise = store.createPromise('myModel', executor);
```

It is also possible to build a chain of promises.

```javascript
        function createAsync(val) {
            return store.createPromise('myModel', function (resolve, reject) {
                setTimeout(function () {
                		// todo smth with val
                    resolve(val);
                }, 10);
            });
        }

        createAsync(val).then(function (val) {
            return createAsync(val);
        }).then(function (val) {
            return createAsync(val);
        }).then(function (val) {
            // todo smth
        });

```

>Take notice that notifications are asynchronous, and the change of the model status in the chain happens only upon its completion.

>Take notice that the check for changes in the model for a notification is performed after **20 ms** upon the ending of the latest promise, in order to exclude the possibility of a double notification after the change of the model before the resolve of the promise.

##Roadmap

###performance
Replace the change transfer algorithm with a smarter one, which considers the native array `changes` from `Object.observe`. 

###changes
Transfer valid `changes`, similar to native ones, to the `observer` function. Currently native ones are transferred, which is not quite correct.