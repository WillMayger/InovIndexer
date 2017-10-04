const fs = require('fs');
const request = require('request');

export default class Files {
  constructor(resume) {
    this.foldername = 'lessons';
    this.basePath = `${this.foldername}`;
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath);
    } else if (!resume) {
      this.foldername = `lessons${parseInt((Math.random() * 100000), 10)}`;
      this.basePath = `${this.foldername}`;
      fs.mkdirSync(this.basePath);
    }

    this.cookies = '';
    this.basePath += '/';
  }

  // sets cookies (login details) for use with the request module
  setCookies(cookies) {
    cookies.forEach((item) => {
      this.cookies += `${item.name}=${item.value};`;
    });
  }

  // check url to ensure it is valid.
  checkURL(url) {
    return new Promise((resolve) => {
      request(url)
        .on('response', (res) => {
          if (res.statusCode === 200) {
            resolve(true);
            this.urlChecked = true;
            return true;
          }
          resolve(false);
          return false;
        })
        .on('error', () => {
          resolve(false);
          return false;
        })
        .on('timeout', () => {
          resolve(false);
          return false;
        })
        .on('uncaughtException', () => {
          resolve(false);
          return false;
        });
    });
  }

  WriteFile(url, filePath) {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(this.basePath + filePath) || url === undefined) {
        resolve();
        return;
      }

      // settings cookies and url for the request
      const reqOptions = {
        url,
        headers: {
          cookie: this.cookies,
        },
      };

      // closure to count the amount of failed attempts
      const errorCounter = (() => {
        let counter = 0;
        return () => {
          counter += 1;
          if (counter === 8) reject(`tried url: "${url}" too many times.`);
          return counter;
        };
      })();

      // make a request with 8 attempts and then fail
      const makeRequest = (onErrCallback) => {
        errorCounter();
        request(reqOptions)
          .on('response', (res) => {
            if (res.statusCode !== 200) onErrCallback(onErrCallback);
          })
          .on('error', () => { onErrCallback(onErrCallback); })
          .on('timeout', () => { onErrCallback(onErrCallback); })
          .on('uncaughtException', () => { onErrCallback(onErrCallback); })
          .pipe(fs.createWriteStream(this.basePath + filePath))
          .on('finish', () => {
            resolve();
          });
      };

      // start making requests!
      makeRequest(() => { setTimeout(() => { makeRequest(); }, 3000); });
    });
  }
  // write json object to path for re use
  WriteJsonObj(obj) {
    const json = JSON.stringify(obj);
    return new Promise((resolve, reject) => {
      // if the file does not exist, write, else give it a new name and then write
      if (!fs.existsSync(`${this.basePath}lessons.json`)) {
        fs.writeFile(`${this.basePath}lessons.json`, json, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      } else {
        fs.writeFile(`${this.basePath}lessons${Math.random() * 100}.json`, json, (err) => {
          if (err) {
            reject(err);
          }
        });
        resolve();
      }
    });
  }

  // write folder if it does not exist
  WriteFolder(folderPath) {
    return new Promise((resolve) => {
      if (fs.existsSync(this.basePath + folderPath)) {
        resolve();
        return;
      }
      fs.mkdirSync(this.basePath + folderPath);
      resolve();
    });
  }
}
