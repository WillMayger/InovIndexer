var fs = require('fs');
var request = require('request');

export class Files {
  constructor(resume) {
    this.foldername = 'lessons';
    this.basePath = '' + this.foldername;
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath);
    } else if (!resume) {
      this.foldername = 'lessons' + parseInt(Math.random() * 1000);
      this.basePath = '' + this.foldername;
      fs.mkdirSync(this.basePath);
    }

    this.cookies = '';
    this.basePath += '/';
  }

  setCookies(cookies) {
    if (this.cookies === '') {
    cookies.forEach((item, index) => {
      this.cookies += item.name + '=' + item.value + ';';
    });
  }
  }

  WriteFile(url, filePath) {

    return new Promise((resolve, reject) => {
      if (url === undefined) resolve();
      let reqOptions = {
        url: url,
        headers: {
          'cookie': this.cookies
        }
      }

      let counter = 0;
       var makeRequest = () => {
         if (counter === 8) reject('tried url: "' + url + '" too many times.');

        request(reqOptions)
        .on('response', (res) => {
          if (res.statusCode !== 200) {
            counter += 1;
            setTimeout(() => {makeRequest();}, 3000);
          }
        })
        .on('error', (e) => {
          counter += 1;
          setTimeout(() => {makeRequest();}, 3000);
        })
        .on('timeout', (e) => {
          counter += 1;
          setTimeout(() => {makeRequest();}, 3000);
        })
        .on('uncaughtException', (e) => {
          counter += 1;
          setTimeout(() => {makeRequest();}, 3000);
        })
        .pipe(fs.createWriteStream(this.basePath + filePath))
        .on('finish', () => {
          resolve();
        });
      };

      makeRequest();
    });

  }

  WriteJsonObj(obj) {
    let json = JSON.stringify(obj);
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.basePath + 'lessons.json')) {
        fs.writeFile(this.basePath + 'lessons.json', json, function(err) {
        if(err) {
            console.log(err);
            reject(err);
        }});
      } else {
        fs.writeFile(this.basePath + 'lessons' + Math.random() * 100 + '.json', json, function(err) {
        if(err) {
          console.log(err);
          reject(err);
        }});
      }

      resolve();

    });
  }

  WriteFolder(folderPath) {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(this.basePath + folderPath)) resolve();
      fs.mkdirSync(this.basePath + folderPath);
      resolve();
    });
  }

}
