# Inov Indexer #
## Contents
### 0. Intro.
### 1. Usage - Starting Fresh (Most Cases).
### 2. Usage - Starting with JSON File.
### 3. Usage - Continuing with download.

## 0. Intro
  Indexes links and download links from certain websites and then downloads them.
  Most of the application uses promises for ease.
  Please ensure, when writing files, you have a minimum of 10gb available (for the audios)
#### - Getting started
1. clone this repository & make sure Node.js is installed (LTS) on your machine.
2. run `npm install`.
3. choose how you want to start the code (three choices below) all located in main.js.
4. you will then be prompted for a url, and then your email and password for that url. (When calling the login class method)


## 1. Usage - Starting Fresh
 When running this for the first time you will want to use this option.

```javascript

let indexer = new Indexer();

indexer.login()
.then(() => {return indexer.startIndex()})
.then(() => {return indexer.writeJsonObj()})
.then(() => {return indexer.writeDownloads()})
.catch((err) => {
  console.log(err);
  indexer.end();
  return;
});


```

## 2. Usage - Starting with JSON File.
 When you have already run the first option once, if you ran it for enough time
 it would have generated a `lessons.json` file within the folder `lessons/`.
 You can then use this file to save time as this file contains all the indexing information.
 Just plug this file into the initiation of the class and run the write function.

```javascript

let obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));
let indexer = new Indexer({lessons: obj, resume: false});

indexer.login()
.then(() => {return indexer.writeDownloads()})
.then(() => {return indexer.end()})
.catch((err) => {
  console.log(err);
  index.end();
  return;
});

```

## 3. Usage - Continuing with download.
 Almost exactly the same as the previous step (2) however we need to pass in another
 option which is `resume` and this needs to be set to `true`.
 This will then continue downloading where you left off instead of starting again.

```javascript

let obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));
let indexer = new Indexer({lessons: obj, resume: true});

indexer.login()
.then(() => {return indexer.writeDownloads()})
.then(() => {return indexer.end()})
.catch((err) => {
  console.log(err);
  index.end();
  return;
});

```
