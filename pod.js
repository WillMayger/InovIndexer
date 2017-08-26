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
      .open(this.baseURL + 'member/login_new.php')
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

  getChildLessons() {
    return new Promise((resolve, reject) => {
      let i,
          length = this.lessons.levels.length;
          for (i = 0; i < length; i++) {
            let lengthChild = this.lessons.levels[i].childlevels.length,
                iChild;
            for (iChild = 0; iChild < lengthChild; iChild++) {

              //the below line is returining undefiend
              // console.log(this.lessons.levels[i].childLevels[iChild])


              this.horseman
              .open(this.lessons.levels[i].childlevels[iChild].url)
              .html()
              .then((html) => {
                cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((i, elem) => {

                  let lesson = cheerio(elem);

                  console.log(this.lessons.levels[i].childlevels[iChild])

                  this.lessons.levels[i].childlevels[iChild].lessons.push(
                    {name: lesson.text(), url: lesson.attr('href')}
                  );


                });
                resolve(this.lessons.levels);
              });

          }
        }

    });
  }

  getParentLessons() {
    return new Promise((resolve, reject) => {
      this.horseman
      .open(this.baseURL + 'index.php?cat=Introduction')
      .html()
      .then((html) => {
        cheerio(html).find('.ill-levels').map((i, elem) => {
          let levelObj = {},
              level = cheerio(elem).find('.ill-level-title'),
              levelName = level.text();
          if(levelName === 'News & Announcements') {
            return true;
          }

          levelObj = {name: levelName, url: 'https:' + level.attr('href'), childlevels: []};
          cheerio(elem).find('.ill-season-title').map((i, childelem) => {
            levelObj.childlevels.push({name: cheerio(childelem).text(), url: cheerio(childelem).attr('href'), lessons: []})
          });
          this.lessons.levels.push(levelObj);

        });
        resolve(this.lessons.levels);
      });
    });
  }
}
