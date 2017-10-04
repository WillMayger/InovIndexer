// other imports
import Files from './files';
// node_module imports
const Horseman = require('node-horseman');
const cheerio = require('cheerio');
const PromisePool = require('es6-promise-pool');
const readline = require('readline');
const path = require('path');
const uuidv1 = require('uuid/v1');
const uuidv5 = require('uuid/v5');
const prompt = require('prompt');


// class makes use of promises.
export default class Indexer {
  constructor(thisOptions) {
    const options = thisOptions || { lessons: undefined, resume: false };

    // check options passed into constructor
    if (!options.resume) options.resume = false;
    // setup
    const horsemanOptions = { timeout: 30000 };
    const horseman = new Horseman(horsemanOptions);
    const files = new Files(options.resume);
    // asigning to this
    this.files = files;
    this.horseman = horseman;
    this.username = '';
    this.passowrd = '';
    this.baseURL = '';

    // If object has been provided, use the file, else begin fresh lesson object.
    if (options.lessons !== undefined) {
      this.lessons = options.lessons;
    } else {
      this.lessons = {
        parents: {},
        children: {},
        lessons: {},
        downloads: {},
        keyArrays: {
          parents: [],
          children: [],
          lessons: [],
          downloads: [],
        },
      };
    }
    // method bindings
    this.askForUserDetails = this.askForUserDetails.bind(this);
    this.getParentsAndChildren = this.getParentsAndChildren.bind(this);
    this.getLessons = this.getLessons.bind(this);
    this.getDownloads = this.getDownloads.bind(this);
    this.processPromisePool = this.processPromisePool.bind(this);
    this.createKeyArray = this.createKeyArray.bind(this);
    this.percentageCalculator = this.percentageCalculator.bind(this);
    this.makeSafeRequest = this.makeSafeRequest.bind(this);
    this.removeForbiddenChars = this.removeForbiddenChars.bind(this);
  }

  // must always be called first when using this class to set cookies to headless browser
  login() {
    return new Promise((resolve, reject) => {
      this.askForUserDetails()
        .then(() => {
          this.files.checkURL(`${this.baseURL}member/login_new.php`)
            .then((res) => {
              if (!res) {
                console.log('Url provided is not compatible...');
                reject(false);
                return;
              }
              console.log('Url provided is valid...');
              console.log('Logging in...');
            });
        })
        .then(() => {
          this.horseman
            .open(`${this.baseURL}member/login_new.php`)
            .type('form[name="login"] input[name="amember_login"]', this.username)
            .type('form[name="login"] input[name="amember_pass"]', this.password)
            .click('form[name="login"] input[name="remember_login"]')
            .click('form[name="login"] button[type="submit"]')
            .waitForNextPage()
            .text('.page-redirect__title.ill-sakai')
            .then((successRes) => {
              // if we have not logged in successfully...
              if (successRes.toString().toLowerCase().indexOf('successfully') === -1) {
                console.log('Not logged in...');
                reject(false);
              }
            })
            .cookies()
            .then(cookies => this.files.setCookies(cookies))
            .then(() => {
              console.log('Logged in successfully');
              resolve(true);
            })
            .catch((err) => { reject(err); });
        });
    });
  }

  // Must be called at the end when finished with all proceses to close node-horseman.
  end() {
    console.log('Ending session...');
    this.horseman.close();
  }

  // Grouping all indexing methods together.
  startIndex() {
    return new Promise((resolve, reject) => {
      this.getParentsAndChildren()
        .then(() => this.getLessons())
        .then(() => this.getDownloads())
        .then(() => { resolve(); })
        .catch((err) => { reject(err); });
    });
  }

  // Used to write download objects to drive.
  writeDownloads() {
    console.log(`Writing files to "${this.files.basePath}" ...`);
    // this function works out the path needed and send all relevant information
    // to be written.
    const downloadFileToPath = downloadItem => new Promise((resolve, reject) => {
      const parentObj = this.lessons.parents[downloadItem.parent_id];
      const childObj = this.lessons.children[downloadItem.child_id];
      const lessonObj = this.lessons.lessons[downloadItem.lesson_id];
      const parentFolder = this.removeForbiddenChars(parentObj.name);
      const childFolder = this.removeForbiddenChars(childObj.name);
      const lessonFolder = this.removeForbiddenChars(lessonObj.name);
      const fullLessonPath = `${parentFolder}/${childFolder}/${lessonFolder}`;
      // path must be created first
      this.files.WriteFolder(parentFolder)
        .then(() => this.files.WriteFolder(`${parentFolder}/${childFolder}`))
        .then(() => this.files.WriteFolder(fullLessonPath))
        .then(() =>
          // once path has been created, write file to the path
          this.files.WriteFile(
            downloadItem.url,
            `${fullLessonPath}/${this.removeForbiddenChars(downloadItem.name)}.${downloadItem.fileType}`,
          ))
        .then(() => { resolve(); })
        .catch((err) => { reject(err); });
    });
    // create multiple promises using the "downloadFileToPath" function and
    // the downloads object.
    // then perform each promise synchronously.
    return this.processPromisePool(downloadFileToPath, 'downloads', null, [this.lessons.keyArrays.downloads]);
  }

  // indexing download links
  getDownloads() {
    console.log('Starting to get downloadables...');
    // function that finds and indexes the downloadables
    const indexDownloadables = lesson => new Promise((resolve, reject) => {
      // function that adds downloadables to lessons obj
      const addDownloadablesToObj = (html) => {
        // sorts the url depending on href given
        const sortUrl = (url) => {
          if (url.charAt(0) === '/') return this.baseURL.slice(0, -1) + url;
          return url;
        };
        const lessonHtml = cheerio(html);
        const cssSelectors = [
          '#pdfs ul li a',
          '#download-center ul li a',
        ];
          // iterate over css selectors and append each download item into object.
        cssSelectors.forEach((cssSelector) => {
          lessonHtml.find(cssSelector).map((index, elem) => {
            const downloadInfoItem = cheerio(elem);
            const downloadName = this.removeForbiddenChars(downloadInfoItem.text().toLowerCase());
            const uuidTimeStampDownload = uuidv1();
            const uuidDownload = uuidv5(downloadName, uuidTimeStampDownload).toString();
            this.lessons.downloads[uuidDownload] = {
              url: sortUrl(downloadInfoItem.attr('href')),
              name: downloadName,
              fileType: path.extname(sortUrl(downloadInfoItem.attr('href'))).split('.').join(''),
              parent_id: lesson.parent_id,
              child_id: lesson.child_id,
              lesson_id: lesson.id,
              id: uuidDownload,
            };
            return this.lessons.downloads[uuidDownload];
          });
        });
      };
        // use the headless browser to get the url and then run a callback with
        // the html obtained
      this.makeSafeRequest(lesson.url, addDownloadablesToObj)
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
    // create multiple promises using the "indexDownloadables" function and
    // the lessons object.
    // then perform each promise synchronously.
    // after compleation create an Array of keys for each item in the
    // lessons object
    return this.processPromisePool(indexDownloadables, 'lessons', 'downloads', [this.lessons.keyArrays.lessons]);
  }

  // indexing lessons
  getLessons() {
    console.log('Starting to get lessons...');
    // sort html and index certain parts by adding to lessons obj
    const indexChildLessons = childItem => new Promise((resolve, reject) => {
      const addToIndex = (html) => {
        cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((index, elem) => {
          const lesson = cheerio(elem);
          const lessonName = lesson.text();
          const uuidTimeStampLesson = uuidv1();
          const uuidLesson = uuidv5(
            this.removeForbiddenChars(lessonName),
            uuidTimeStampLesson,
          ).toString();
          this.lessons.lessons[uuidLesson] = {
            name: lessonName,
            url: lesson.attr('href'),
            parent_id: childItem.parent_id,
            child_id: childItem.id,
            id: uuidLesson,
          };
          return this.lessons.lessons[uuidLesson];
        });
      };
        // use the headless browser to get the url and then run a callback with
        // the html obtained
      this.makeSafeRequest(childItem.url, addToIndex)
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
    // create multiple promises using the "indexChildLessons" function and
    // the children object.
    // then perform each promise synchronously.
    // after compleation create an Array of keys for each item in the
    // children object
    return this.processPromisePool(indexChildLessons, 'children', 'lessons', [this.lessons.keyArrays.children]);
  }

  // Get the first level of lessons
  getParentsAndChildren() {
    console.log('Starting to get parent & child lessons...');
    return new Promise((resolve, reject) => {
      const indexParentsAndChildren = (html) => {
        cheerio(html).find('.ill-levels').map((i, elem) => {
          const parent = cheerio(elem).find('.ill-level-title');
          const parentName = parent.text();
          // this level needs skipping over!
          if (parentName === 'News & Announcements') return true;
          const uuidTimeStampParent = uuidv1();
          const uuidParent = uuidv5(
            this.removeForbiddenChars(parentName),
            uuidTimeStampParent,
          ).toString();
          this.lessons.parents[uuidParent] = {
            name: parentName,
            url: `https:${parent.attr('href')}`,
            id: uuidParent,
          };
          // loop over each level item and add them to the this.lessons obj
          return cheerio(elem).find('.ill-season-title').map((i2, childelem) => {
            if (childelem && childelem !== 0) {
              const childName = cheerio(childelem).text();
              const uuidTimeStampChild = uuidv1();
              const uuidChild = uuidv5(
                this.removeForbiddenChars(childName),
                uuidTimeStampChild,
              ).toString();

              this.lessons.children[uuidChild] = {
                name: cheerio(childelem).text(),
                url: cheerio(childelem).attr('href'),
                parent_id: uuidParent,
                id: uuidChild,
              };

              return this.lessons.children[uuidChild];
            }
            return false;
          });
        });
      };
      // use the headless browser to get the url and then run a callback with
      // the html obtained
      this.makeSafeRequest(`${this.baseURL}index.php?cat=Introduction`, indexParentsAndChildren)
        .then(() => {
          this.createKeyArray(this.lessons.parents, 'parents');
          this.createKeyArray(this.lessons.children, 'children');
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  // safer way to execute horseman with a bad internet connection
  makeSafeRequest(url, callback) {
    return new Promise((resolve, reject) => {
      this.horseman
        .open(url)
        .html()
        .then((html) => { callback(html); })
        .then(() => { resolve(); })
        .catch(() => {
          setTimeout(() => {
            this.horseman
              .open(url)
              .wait(10000)
              .html()
              .then((html) => { callback(html); })
              .then(() => { resolve(); })
              .catch((err) => { reject(err); });
          }, 10000);
        });
    });
  }

  processPromisePool(asyncProcess, thisLessonsType, thisOutputKeyArray, percentageArray) {
    const percentageCalc = this.percentageCalculator(percentageArray);
    const generatePromises = function* generatePromises() {
      const lengthI = this.lessons.keyArrays[thisLessonsType].length;
      for (let i = 0; i < lengthI; i += 1) {
        const objID = this.lessons.keyArrays[thisLessonsType][i];
        // calling closure for calculation of percentage done
        percentageCalc();
        // calling async process for indexing.
        yield asyncProcess(this.lessons[thisLessonsType][objID]);
      }
    }.bind(this); // this function requires this scope of this so it must be bound to it.

    const promiseIterator = generatePromises();
    const pool = new PromisePool(promiseIterator, 1);
    // start pool and resolve when all promises have been resolved
    return pool.start().then(() => {
      if (thisOutputKeyArray !== null && thisOutputKeyArray !== undefined) {
        this.createKeyArray(this.lessons[thisOutputKeyArray], thisOutputKeyArray);
      }
    });
  }

  // Writes lessons obj to drive for re-use.
  writeJsonObj() {
    console.log(`Writing json file to "${this.files.basePath}lessons.json" ...`);
    this.files.WriteJsonObj(this.lessons);
  }

  // closure for calculating percentage done.
  percentageCalculator(arrayOfArraysParam) {
    console.log(' ');

    const calcPercentageLength = (arrayOfArrays) => {
      if (!arrayOfArrays) return 0;
      let totallength = 0;
      arrayOfArrays.forEach((array) => {
        totallength += parseInt(array.length, 10);
      });
      return totallength;
    };

    let itemIndex = 0;
    const itemsLength = calcPercentageLength(arrayOfArraysParam);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return () => {
      if (itemIndex === itemsLength - 1) {
        readline.clearLine(rl, 0);
        readline.cursorTo(rl, 0);
        rl.write('Percentage Completed: 100%');
        rl.close();
        console.log(' ');
        this.percentageCalculatorDone = true;
        return true;
      }

      const oneP = itemIndex / itemsLength;
      const percentage = parseInt(oneP * 100, 10);

      readline.clearLine(rl, 0);
      readline.cursorTo(rl, 0);
      rl.write(`Percentage Completed: ${percentage}%`);
      itemIndex += 1;
      return false;
    };
  }

  createKeyArray(obj, type) {
    this.lessons.keyArrays[type] = Object.keys(obj);
  }

  askForUserDetails() {
    return new Promise((resolve, reject) => {
      const schema = {
        properties: {
          url: {
            required: true,
          },
          email: {
            required: true,
          },
          password: {
            hidden: true,
            required: true,
          },
        },
      };
      prompt.start();
      prompt.get(schema, (err, result) => {
        if (err) {
          reject();
          return;
        }

        const userResult = result;
        this.username = userResult.email.toString();
        this.password = userResult.password.toString();
        this.baseURL = userResult.url.substr(-1) === '/' ? userResult.url += '/' : userResult.url.toString();
        resolve();
      });
    });
  }

  // Mainly for windows users
  removeForbiddenChars(stringItem) {
    // check param
    if (stringItem === undefined) return undefined;
    let outputString = stringItem;
    // array of forbidden Chars and what to replace them with
    const forbiddenArray = [
      { char: ' ', replaceWith: '_' },
      { char: '<', replaceWith: '__lessthan__' },
      { char: '>', replaceWith: '__morethan__' },
      { char: ':', replaceWith: '__colon__' },
      { char: '"', replaceWith: '__quote__' },
      { char: '|', replaceWith: '__pipe__' },
      { char: '?', replaceWith: '__questionmark__' },
      { char: '/', replaceWith: '__slash__' },
      { char: '\\', replaceWith: '__backslash__' },
      { char: '.', replaceWith: '__period__' },
      { char: '*', replaceWith: '__asterisk__' },
    ];
    // loop over array and then replace any forbidden chars
    forbiddenArray.forEach((obj) => {
      outputString = outputString.split(obj.char).join(obj.replaceWith);
    });

    this.removeForbiddenCharsDone = true;
    return outputString;
  }
}
