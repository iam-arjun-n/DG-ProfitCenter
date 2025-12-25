const cds = require("@sap/cds");
const SequenceHelper = require("./lib/SequenceHelper");
const fs = require("fs/promises");
const path = require("path");

class ProfitCenterService extends cds.ApplicationService {
  async init() {
    const db = await cds.connect.to("db");
    const { ETY_WORKFLOW_HEADER, ETY_WORKFLOW_ITEM } = this.entities;

    this.before("CREATE", ETY_WORKFLOW_HEADER, async (req) => {
      let requestIdSequence;
      if (db.kind === "postgres") {
        requestIdSequence = new SequenceHelper({
          db: db,
          sequence: "reqid",
          table: "com_deloitte_mdg_productionversion_ety_workflow_header",
          field: "reqid"
        });
      } else if (db.kind === "sqlite") {
        requestIdSequence = new SequenceHelper({
          db: db,
          sequence: "ReqId",
          table: "mdg_profitcenter_ui_ety_workflow_header",
          field: "ReqId"
        });
      } else if (db.kind === "hana") {
        requestIdSequence = new SequenceHelper({
          db: db,
          sequence: "REQID",
          table: "MDGPROFITCENTER_DB_ETY_WORKFLOW_HEADER",
          field: "REQID"
        });
      }

      let prefix = "REQ";
      const type = req.data.Type;

      if (type === "Change") {
        prefix = "CRQ";
      } else if (type === "Extend") {
        prefix = "EXQ";
      }

      const tx = cds.transaction(req);
      await tx.run(async () => {
        req.data.requestIdSequence = await requestIdSequence.getNextNumber();
        let zeroChars = Array(7 - req.data.requestIdSequence.toString().length).fill(0).join("");
        req.data.ReqId = prefix + zeroChars + req.data.requestIdSequence;
      });
    });

    this.on("downloadTemplate", async () => {
    const filePath = path.join(__dirname, "template/Profit Center Mass Upload Template.xlsx");
    return await fs.readFile(filePath);
});


    return super.init();
  }
}

module.exports = { ProfitCenterService };
