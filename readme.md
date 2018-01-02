# electron-proxy-store

> Easy, auto-saving data persistence for your [Electron](https://electron.atom.io) app or module - Save and load user preferences, app state, cache, etc.

Electron doesn't have a built-in way to persist data across app launches. This module handles that for you, so you can focus on building your app. 

Electron-proxy-store uses [Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), the most modern way to handle fundamental actions (i.e. setting and deleting variables) and attach other actions to those actions, in this case, to automatically save the data object to disk.

Unlike other data storage modules which require you to use specific functions to set, get, delete, and otherwise interact with your store, Electron-proxy-store allows you to interact with the Store like any other variable.

The data is saved in a JSON file in (by default) [`app.getPath('userData')`](http://electron.atom.io/docs/api/app/#appgetpathname).

You can use this module directly in both the main and renderer process.

Changes are written to disk atomically, so if the process crashes during a write, it will not corrupt the existing config.


## Node.js (Install)

Requirements:

- Node.js
- npm (Node.js package manager)

```bash
npm install electron-proxy-store
```


## Usage

```js
const Store = require('electron-proxy-store')
const store = new Store()

// Assign properties as usual
store.data.unicorn = '🦄'
console.log(store.data.unicorn)
//=> '🦄'

delete store.data.unicorn
console.log(store.data.unicorn);
//=> undefined

// You can also nest as deep as you like
store.data.unicornFamily = {
    daddy = 'D🦄',
    mommy = 'M🦄',
    children = {
        sister = 's🦄',
        brother = 'b🦄'
    }
}
```


## API

### Store([options])

Returns a new instance.

### Options

#### defaults

Type: `Object`

Default data.

#### name

Type: `string`<br>
Default: `config`

Name of the storage file (without extension).

This is useful if you want multiple storage files for your app. Or if you're making a reusable Electron module that persists some data, in which case you should **not** use the name `config`.

#### path

Type: `string`<br>
Default: [`app.getPath('userData')`](http://electron.atom.io/docs/api/app/#appgetpathname)`.name.json`

Storage file location. *Don't specify this unless absolutely necessary!*

If a relative path, it's relative to the default cwd. For example, `{cwd: 'unicorn'}` would result in a storage file in `~/Library/Application Support/App Name/unicorn`.

#### defaults
Type: `object`<br>
Default: { }

#### encryptionKey

Type: `string`<br>
Default: `undefined`

This can be used as a secure way to store sensitive data by prompting the user for the password before loading the store.

Note that this should not be used for security purposes **if the encryption key is inside a plain-text Electron app**. In this case, its main use would be for obscurity. If a user looks through the config directory and finds the config file, since it's just a JSON file, they may be tempted to modify it. By providing an encryption key, the file will be obfuscated, which should hopefully deter any users from doing so.

Even so, it has the added bonus of ensuring the config file's integrity. If the file is changed in any way, the decryption will not work, in which case  you can specify the option `useAsIntegrityCheck` to reload the store back to its default state.

When specified, the store will be encrypted using AES encryption algorithm.

Encryption is handled using Evanvosberg's ['crypto-js'](https://www.npmjs.com/package/crypto-js) module.

#### useAsIntegrityCheck
Type: `boolean`<br>
Default: false

If set to `true`, the store will initialize with the default options if the stored file fails to be decrypted for any of the 2 following reasons:

1) The file has been tampered with or has been corrupted.

2) `encryptionKey` is incorrect.

**Warning** Loading the store with the `defaults` and the same `path` and `name` **will overwrite the previous data**.

Therefore, this should be set to false in almost all situations when using encryption.

#### decryptErrorHandler
Type: `function`<br>
Default: function (err) { }

The callback to execute when the file is read (see `saveToDiskErrorHandler` below) but fails to decrypt into a JavScript object or variable.

This is useful for re-prompting the user for a password or location.

**This callback is SKIPPED if `useAsIntegrityCheck` is set to true**.

#### saveToDiskErrorHandler
Type: `function`<br>
Default: function (err) { }

The callback to execute if there is an error opening the store file **except when the file doesn't exist**, such as on first launch, in which case the store creates a new file.

### Instance

#### .name

The filename without the ".json".

#### .path

Path to the storage file.

#### .defaults

The default data. `store.reset()` will restore to this.

#### .encryptionKey

The current encryption key.

#### .data

Where the data is stored. Write properties to this object. Writing a value to `store.data` will overwrite the proxy, making it stop working.

#### .backup(location)

Saves a copy of `store.data` to `location`.

#### .changePassword(newPass)

Replaces old file with a file encrypted with `newPass`. Leaving `newPass` blank will write the file unencrypted.

#### .changeSaveLocation(newPath, newName)

Saves the store to `newPath.newName.json`. If newName is blank, the store will continue using the old filename.

#### .clear()

Sets `store.data` to an empty object, `{}`.

#### .save()

Saves the store data. There shouldn't really be any reason to call this yourself.

#### .reset()

Resets `store.data` to `options.defaults`.

#### .openInEditor()

Open the storage file in the user's editor.

## License

MIT © ParmesanPangolin