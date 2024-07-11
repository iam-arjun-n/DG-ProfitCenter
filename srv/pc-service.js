const cds = require("@sap/cds");

class ProfitCenterService extends cds.ApplicationService {
    init() {
        this.before(["CREATE"], "ETY_WORKFLOW_HEADERSet", async context => {
            const db = await cds.connect.to("db");

            // Changing the key value when requested from workflow ui5 alone : 
            if (context.data.ReqId === "NEWREQUEST" || context.data.ReqId === "CHANGEREQUEST" || context.data.ReqId === "EXTENDREQUEST") {
                // const productId = new SequenceHelper({
                //     db: db,
                //     sequence: "ID",
                //     table: "MDG_ASSETMASTER_ETY_WORKFLOW_HEADER",
                //     field: "ID"
                // });

                context.data.ID = await db.run(`SELECT MAX(ID) FROM "MDGPROFITCENTER_DB_ETY_WORKFLOW_HEADER"`)
                    .then(result => {
                        let nextNumber = result[0]['MAX(ID)'] ? result[0]['MAX(ID)'] : 0;
                        nextNumber += 1;
                        return nextNumber;
                    });
                // const req_id = "REQ";
                //	const req_id = (context.data.ReqId === "NEWREQUEST") ? "REQ" : "CRQ";
                const req_id = (context.data.ReqId === "NEWREQUEST") ? "REQ" : (context.data.ReqId === "CHANGEREQUEST") ? "CRQ" : "EXQ";
                let number = context.data.ID;
                let seq = number.toString().padStart(7, '0');
                let reqid = req_id + seq;

                context.data.ReqId = reqid;
                console.log("request id", reqid)
            }
        });

        this.on('READ', 'CompanyCodeVH', async function (req, res) {
            const ZDEMPBTPSRV = await cds.connect.to("ZDEMP_BTP_SRV");
            return ZDEMPBTPSRV.run(req.query);
        });
        return super.init()
    }
}

module.exports = {
    ProfitCenterService
}