module.exports = class SequenceHelper {
    constructor(options) {
        this.db = options.db;
        this.sequence = options.sequence;
        this.table = options.table;
        this.field = options.field || "ID";
    }

    getNextNumber() {
        return new Promise((resolve, reject) => {
            let nextNumber = 0;
            switch (this.db.kind) {
                case "hana":
                    this.db.run(`SELECT COUNT("${this.field}") FROM "${this.table}"`)
                        .then(result => {
                            console.log("sequencehelper :", result);
                            let max = 0;
                            // if (result[0].count !== null) {
                            //     max = parseInt(result[0].count);
                            // }
                            if (result[0]['COUNT(REQID)'] !== null) {
                                max = parseInt(result[0]['COUNT(REQID)']);
                            }

                            nextNumber = max + 1;
                            resolve(nextNumber);
                        })
                        .catch(error => {
                            reject("sequencehelper :", error);
                        })
                    break;
                case "postgres":
                    this.db.run(`SELECT COUNT("${this.field}") FROM "${this.table}"`)
                        .then(result => {
                            console.log(`sequencehelper select count success:, ${result}`);
                            let max = 0;
                            if (result[0].count !== null) {
                                max = parseInt(result[0].count);
                            }

                            nextNumber = max + 1;
                            resolve(nextNumber);
                        })
                        .catch(error => {
                            reject(`sequencehelper select count catch: ${error}`);
                        })
                    break;



                default:
                    reject(new Error(`Unsupported DB kind --> ${this.db.kind}`));
            }
        });
    }
}