# Hub - A Node.js Service Locator Library

`hub` is a lightweight service locator library for Node.js. It allows you to register, retrieve, and manage services, making dependency injection easier and decoupling your modules. This library supports asynchronous service initialization, de-initialization, and lazy-loading of services using promises.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Creating Hub Instance](#creating-hub-instance)
  - [Registering Services](#registering-services)
  - [Retrieving Services](#retrieving-services)
  - [Destroying Services](#destroying-services)
  - [Unregistering Services](#unregistering-services)
  - [Checking Service Status](#checking-service-status)
- [API](#api)
  - [`register(name, constructor, destructor)`](#register)
  - [`get(name, standalone)`](#get)
  - [`destroy(name, service)`](#destroy)
  - [`unregister(name)`](#unregister)
  - [`isRegistered(name)`](#isregistered)
  - [`getRegistered()`](#getregistered)
  - [`isInitiated(name)`](#isinitiated)
  - [`getInitiated()`](#getinitiated)
  - [`standalone()`](#standalone)

## Installation

Install via npm:

```bash
npm install hub
```

## Usage

### Creating Hub Instance

To initialize the service locator in your application, create a standalone instance of `hub` in the main entry point of your application:

```js
const hub = require('hub').standalone();
```

In all other files across your application, you can simply include `hub` using:

```js
const hub = require('hub');
```

This ensures that all parts of your application share the same `hub` instance.

### Registering Services

You can register a service with the `register()` method. A service constructor should return a promise that resolves to the service object, and an optional destructor can be provided for clean-up. Here's an example using `async/await`:

```js
const hub = require('hub');

// Register a service
hub.register('logger', async () => {
    return {
        log: (message) => console.log(message),
    };
});
```

### Retrieving Services

Once a service is registered, you can retrieve it using the `get()` method. The service will be lazily initialized the first time it's accessed:

```js
const logger = await hub.get('logger');
logger.log('Service Locator Initialized!');
```

### Destroying Services

To properly clean up resources, you can destroy a service by calling `destroy()`. This will execute the optional destructor provided during registration:

```js
await hub.destroy('logger');
console.log('Logger service destroyed');
```

### Unregistering Services

If needed, services can be unregistered to remove them from the service locator. This will not destroy an already initiated service:

```js
hub.unregister('logger');
```

### Checking Service Status

You can check if a service is registered or initiated:

```js
console.log(hub.isRegistered('logger'));  // true/false
console.log(hub.isInitiated('logger'));   // true/false
```

## API

### `register(name, constructor, destructor)`

Registers a service with a given name.

- **name**: `String` - The name of the service.
- **constructor**: `Function` - A function that returns a promise resolving to the service instance.
- **destructor** (optional): `Function` - A function that returns a promise for cleaning up the service.

Returns `true` if successful.

### `get(name, standalone)`

Retrieves the service instance by its name. If `standalone` is true, it will not cache the service and will always invoke the constructor.

- **name**: `String | Array` - Name of the service (or array of names).
- **standalone**: `Boolean` (optional) - If true, the service will not be cached.

Returns a `Promise` that resolves to the service instance.

### `destroy(name, service)`

Destroys a service and calls the registered destructor (if provided).

- **name**: `String | Array` - Name of the service or array of services.
- **service** (optional): The service instance to destroy.

Returns a `Promise`.

### `unregister(name)`

Unregisters a service by its name.

- **name**: `String` - Name of the service.

Throws an error if the service is not registered. Returns `true` if successful.

### `isRegistered(name)`

Checks if a service is registered.

- **name**: `String` - Name of the service.

Returns `true` if the service is registered, otherwise `false`.

### `getRegistered()`

Retrieves a list of all registered services.

Returns an array of service names.

### `isInitiated(name)`

Checks if a service has been initiated.

- **name**: `String` - Name of the service.

Returns `true` if the service is initiated, otherwise `false`.

### `getInitiated()`

Retrieves a list of all initiated services.

Returns an array of initiated service names.

### `standalone()`

Returns a new instance of the Hub that is not cached by the `require` system. Useful for creating isolated service locators.