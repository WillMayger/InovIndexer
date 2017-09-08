var fs = require('fs');
var request = require('request');

export class Files {
  constructor(resume) {
    this.foldername = 'lessons';
    this.basePath = '' + this.foldername;
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath);
    } else if (!resume) {
      this.foldername = 'lessons' + parseInt((Math.random() * 100000));
      this.basePath = '' + this.foldername;
      fs.mkdirSync(this.basePath);
    }

    this.cookies = '';
    this.basePath += '/';
  }

  //sets cookies (login details) for use with the request module
  setCookies(cookies) {
    cookies.forEach((item, index) => {
      this.cookies += item.name + '=' + item.value + ';';
    });
  }

  //check url to ensure it is valid.
  checkURL(url) {
    return new Promise((resolve, reject) => {
      request(url)
      .on('response', (res) => {
        if (res.statusCode === 200) {
          resolve(true);
          return true;
        }
        resolve(false);
        return false;
      })
      .on('error', (e) => {
        resolve(false);
        return false;
      })
      .on('timeout', (e) => {
        resolve(false);
        return false;
      })
      .on('uncaughtException', (e) => {
        resolve(false);
        return false;
      });
    });
  }

  WriteFile(url, filePath) {
    return new Promise((resolve, reject) => {

      if (fs.existsSync(this.basePath + filePath) || url === undefined)  {
        resolve();
        return;
      }

      //settings cookies and url for the request
      let reqOptions = {
        url: url,
        headers: {
          'cookie': this.cookies
        }
      }

      //closure to count the amount of failed attempts
      let errorCounter = (() => {
        let counter = 0;
        return () => {
          counter += 1;
          if (counter === 8) reject('tried url: "' + url + '" too many times.');
          return counter;
        }
      })();

      //make a request with 8 attempts and then fail
      let makeRequest = (onErrCallback) => {
        errorCounter();
        request(reqOptions)
        .on('response', (res) => {
          if (res.statusCode !== 200) onErrCallback(onErrCallback);
        })
        .on('error', (e) => {onErrCallback(onErrCallback);})
        .on('timeout', (e) => {onErrCallback(onErrCallback);})
        .on('uncaughtException', (e) => {onErrCallback(onErrCallback);})
        .pipe(fs.createWriteStream(this.basePath + filePath))
        .on('finish', () => {
          resolve();
          return;
        });
      };

      //start making requests!
      makeRequest(() => {setTimeout(() => {makeRequest();}, 3000)});
    });
  }
  //write json object to path for re use
  WriteJsonObj(obj) {
    let json = JSON.stringify(obj);
    return new Promise((resolve, reject) => {
      //if the file does not exist, write, else give it a new name and then write
      if (!fs.existsSync(this.basePath + 'lessons.json')) {
        fs.writeFile(this.basePath + 'lessons.json', json, function(err) {
          if(err) {
            reject(err);
            return;
          }
          resolve();
          return;
        });
      } else {
        fs.writeFile(this.basePath + 'lessons' + Math.random() * 100 + '.json', json, function(err) {
          if(err) {
            reject(err);
            return;
          }
        });
        resolve();
      }
    });
  }

  //write folder if it does not exist
  WriteFolder(folderPath) {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(this.basePath + folderPath)) {
        resolve();
        return;
      }
      fs.mkdirSync(this.basePath + folderPath);
      resolve();
    });
  }
}
