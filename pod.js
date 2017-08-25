import { cred } from './cred';
var Horseman = require("node-horseman");
var cheerio = require('cheerio');

export class Pod {
  constructor() {
    var horseman = new Horseman();
    this.horseman = horseman;
    this.baseURL = 'https://www.frenchpod101.com/';
    this.lessons = {
      levels: []
    };
  }

  login() {
    return new Promise((resolve, reject) => {
      this.horseman
        .open('https://www.frenchpod101.com/member/login_new.php')
        .type('form[name="login"] input[name="amember_login"]', 'wmayger@outlook.com')
        .type('form[name="login"] input[name="amember_pass"]', cred.toString())
        .click('form[name="login"] input[name="remember_login"]')
        .click('form[name="login"] button[type="submit"]')
        .waitForNextPage()
        .text('.page-redirect__title.ill-sakai')
        .then((success) => {
          if (success.toString().toLowerCase().indexOf('successfully')) {
            resolve(true);
          }
          reject(false);
        });
    });
  }

  end() {
    this.horseman.close();
  }

  checkLogin() {
    return new Promise((resolve, reject) => {
      this.horseman
        .open(this.baseURL)
        .text('.dashbar-a__nav-item--sub.ill-ease-color')
        .then((loggedInElem) => {
          if (loggedInElem.toString().toLowerCase().indexOf('sign out')) {
            resolve(true);
          }
          reject(false);
        });
    });
  }

  getLessons() {
    return new Promise((resolve, reject) => {
      this.horseman
        .open('https://www.frenchpod101.com/index.php?cat=Introduction')
        .html()
        .then((html) => {
          let htmlDoc = cheerio.load(html);
          htmlDoc('.ill-levels').map(function(i, elem) {
            let levelObj = {};
            let level = cheerio(elem).find('.ill-level-title');
            let levelName = level.text();
            if(levelName === 'News & Announcements') {
              return true;
            }

            levelObj = {name: levelName, url: 'https:' + cheerio(elem).find('.ill-level-title').attr('href'), childlevels: []};

            cheerio(elem).find('.ill-season-title').map(function(i, childelem) {
              levelObj.childlevels.push({name: cheerio(childelem).text(), url: cheerio(childelem).attr('href')})
            }.bind(this));

            this.lessons.levels.push(levelObj);


          }.bind(this));
          resolve(this.lessons.levels);
        });
        });
  }

}
