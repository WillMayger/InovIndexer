var fs = require('fs');
var request = require('request');

export class Files {
  constructor() {
    this.foldername = 'lessons';
    this.basePath = '' + this.foldername;
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath);
    } else {
      this.foldername = 'lessons' + parseInt(Math.random() * 1000);
      this.basePath = '' + this.foldername;
      fs.mkdirSync(this.basePath);
    }

    this.basePath += '/';
  }

  WriteFile(url, filePath, cookies) {
    let cookieString = '';
    cookies.forEach((item, index) {
      cookieString += item.name + '=' + item.value + ';';
    });
    return new Promise((resolve, reject) => {
      let reqOptions = {
        url: url,
        headers: {
          'cookie': cookieString
        }
      }
      request(reqOptions)
      .pipe(fs.createWriteStream(this.basePath + filePath))
      .on('finish', () => {
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
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
      fs.mkdirSync(this.basePath + folderPath);
      resolve();
    });
  }

}
