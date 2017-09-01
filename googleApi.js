const google        = require('googleapis');
const key           = require('./My Project-85b35e4ee577.json');
const drive         = google.drive('v3');

export class GoogleAPI {

  constructor() {
    this.basefolder = '0B2Mgsut58AMxczAweEJYMHNOOXc';
    this.auth = new google.auth.JWT(
    	key.client_email,
    	null,
    	key.private_key,
    	[
    		'https://www.googleapis.com/auth/drive',
    		'https://www.googleapis.com/auth/drive.file'
    	],
    	null
    );
  }

  Auth() {
    return new Promise((resolve, reject) => {
      this.auth.authorize( (err, tokens) => {
        if (err) {
          console.log(err);
          reject();
        }

        console.log("Authorised with Google API.")
        resolve();
      });
    });
  }

  CreateFile(fileName, parentsArray=this.basefolder) {
    // example of saving file from url
    // request('http://fromrussiawithlove.com/baby.mp3').pipe(fs.createWriteStream('song.mp3'))
  }

  CreateFolder(folderName, parentsArray=this.basefolder) {
    return new Promise((resolve, reject) => {
      var fileMetadata = {
        'name' : folderName,
        'mimeType' : 'application/vnd.google-apps.folder',
        parents: parentsArray
      };
      drive.files.create({
        resource: fileMetadata,
        auth: this.auth,
        fields: 'id'
      }, function(err, file) {
        if(err) {
          console.log(err);
          reject(err);
        }
        resolve(file.id);
      });
    });
  }
}
