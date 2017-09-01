var fs = require('fs');
var request = require('request');

export class Files {
  constructor() {
    this.foldername = 'lessons';
    this.basePath = '' + this.foldername;
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath);
    } else {
      this.foldername = 'lessons' + Math.random() * 100;
      this.basePath = '' + this.foldername;
      fs.mkdirSync(this.basePath);
    }

    this.basePath += this.basePath + '/';
  }

  WriteFile(url, filePath) {
    return new Promise((resolve, reject) => {
      request(url)
      .pipe(fs.createWriteStream(this.basePath + filePath))
      .then(() => {
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
    });
  }

  WriteJsonObj(json) {
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
