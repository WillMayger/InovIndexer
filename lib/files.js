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

    this.cookies = '';

    this.basePath += '/';
  }

  setCookies(cookies) {
    cookies.forEach((item, index) => {
      this.cookies += item.name + '=' + item.value + ';';
    });
  }

  WriteFile(url, filePath) {
    if (url === undefined) resolve();

    return new Promise((resolve, reject) => {
      let reqOptions = {
        url: url,
        headers: {
          'cookie': this.cookies
        }
      }
      request(reqOptions)
      .pipe(fs.createWriteStream(this.basePath + filePath))
      .on('finish', () => {
        resolve();
      });

    });

    // return new Promise((resolve, reject) => {
    //   this.horseman.download(url, filePath, true)
    //   .then(() => {
    //     resolve();
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //     reject(err);
    //   });
    // });
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
