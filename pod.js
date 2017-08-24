import { cred } from './cred';
var Horseman = require("node-horseman");
var cheerio = require('cheerio');

export class Pod {
  constructor() {
    var horseman = new Horseman();
    this.horseman = horseman;
    this.baseURL = 'https://www.frenchpod101.com/';
    this.lessons = {

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

  getUpperLessons() {
    return new Promise((resolve, reject) => {
      this.horseman
        .open('https://www.frenchpod101.com/index.php?cat=Introduction')
        .html()
        .then((html) => {
          var htmlDoc = cheerio.load(html);
          let lessons = htmlDoc('.ill-level-title')


          console.log(lessons);
          let i;
          let len = lessons.length;
          for (i = 0; i < len; i++) {
            console.log(cheerio.load(lessons[i]).text());
            console.log(cheerio.load(lessons[i]).attr('href'));
          }
          resolve(lessons)
        })
    });
  }

}
