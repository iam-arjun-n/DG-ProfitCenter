sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
], (Controller,JSONModel,Fragment) => {
    "use strict";

    return Controller.extend("com.deloitte.mdg.profitcenter.approver1.pcapprover.controller.Approver", {
        onInit() {
            debugger
            var oPCModel = new JSONModel();
          oPCModel.setData([]);
          this.getOwnerComponent().setModel(oPCModel, "oPCModel");
            var oComponentData = this.getOwnerComponent().getComponentData();
            console.log("Component startupParameters:", oComponentData.startupParameters);
            if (oComponentData && oComponentData.startupParameters) {
                // Request ID is usually passed in startupParameters
                let fullTitle = oComponentData.startupParameters.taskModel.oData.TaskTitle || "";
                let reqId = fullTitle.split(" - ")[0].trim();

                // let reqId = oComponentData.startupParameters.taskModel.oData.TaskTitle;
                //  reqId = "REQ0000025";
                if (reqId) {
                    this.reqId = reqId; // store for later use
                    this.loadDataByReqId(reqId); // load table/comments
                } else {
                    MessageBox.error("Request ID not found in task context.");
                }
                
            }
        },



        loadDataByReqId: function (reqId) {
            debugger;
            var oModel = this.getOwnerComponent().getModel("mainServiceModel");
            if (!oModel) {
                MessageBox.error("OData model not available!");
                return;
            }

            oModel.read("/ETY_WORKFLOW_HEADERSet('" + reqId + "')", {
                urlParameters: {
                    "$expand": "NAV_WORKFLOW_ITEMSET,NAV_WORKFLOW_COMMENTS"
                },
                success: (oData) => {
                    // Prepare JSON model for table
                    var structuredData = {
                        LineItems: oData.NAV_WORKFLOW_ITEMSET?.results || []
                    };

                    // Set data to pvModel for binding table
                    var oLocalModel = this.getOwnerComponent().getModel("pcModel");
                    oLocalModel.setData(structuredData);

                    // Set comments
                    var oCommentModel = this.getOwnerComponent().getModel("commentModel");
                    oCommentModel.setData(oData.NAV_WORKFLOW_COMMENTS?.results || []);
                },
                error: () => {
                    MessageBox.error("Error fetching data for ReqId: " + reqId);
                }
            });
        },

        onView:function(){
            let oView = this.getView();
          const oTable = this.byId("profitCenterTable");
        const oSelectedItem = oTable.getSelectedItem();
        if (!oSelectedItem) {
          sap.m.MessageToast.show("Please select a record to view.");
          return;
        }
        const oModel = this.getView().getModel("pcModel");
        const oData = oSelectedItem.getBindingContext("pcModel");
        var sPath = oData.getPath();
        this._editIndex = parseInt(sPath.split("/")[2]); // store index for updating
        this._isEditMode = true;
        var sProfitCenter = oData.getProperty(sPath + "/profitcenter");
        this.fetchData(sProfitCenter, sPath);
        },

        fetchData: function (sProfitCenter, sPath) {
        var oModel = this.getView().getModel("pcModel");
        var pcData = oModel.getProperty("/LineItems");
        var oSelectedData = pcData.find(item => item.profitcenter === sProfitCenter);
        this.openView(oSelectedData, sPath);
      },

      openView: async function (oSelectedData, sPath) {
    let oView = this.getView();

    var osharedModel = oView.getModel("pcModel");
    osharedModel.setProperty("/SelectedItem", oSelectedData);

    var oMainModel = oView.getModel("pcModel");
    var aLineItems = oMainModel.getProperty("/LineItems") || [];
    var oSelectedRow = aLineItems[this._editIndex] || {};

    var oLocalModel = oView.getModel("oPCModel");
    if (oLocalModel) {
        oLocalModel.setData(oSelectedRow);
    }

    // ✅ Load fragment only once
    if (!this._PCFragment) {
        this._PCFragment = await Fragment.load({
            id: oView.getId(),
            name: "com.deloitte.mdg.profitcenter.approver1.pcapprover.fragments.CreatePC",
            controller: this
        });

        // ✅ Add dependent AFTER fragment is resolved
        oView.addDependent(this._PCFragment);
    }

    // ✅ Safe now
    this.byId("dAddProfitCenter").setTitle("Edit Profit Center");
    this._PCFragment.open();
},
onCancelPCFragment() {
         if (this._PCFragment) {
        this._PCFragment.close();
    }

    // pass data into fragment
    // const oFragModel = new sap.ui.model.json.JSONModel(oData);
    // this._oViewFragment.setModel(oFragModel, "viewModel");

    
},
onApprove: async function () {
    const inboxAPI = this.getOwnerComponent()
        .getComponentData()
        .startupParameters
        .inboxAPI;

    try {
        // 1️⃣ Business logic
        await this.postToSAP();

        // 2️⃣ COMPLETE BPA TASK
        inboxAPI.updateTask({
            decision: "approve",     // must match outcome id
            context: {
                Approve: "X",
                ApproverId: sap.ushell.Container
                    .getUser()
                    .getId(),
                TaskInfo: {
                    Decision: "Approve"
                }
            }
        });

        sap.m.MessageToast.show("Approved successfully");

    } catch (e) {
        sap.m.MessageBox.error(
            "Posting to SAP failed. Task not completed."
        );
        throw e; // blocks Inbox completion
    }
},
onReject: async function () {

  // (Optional) call backend / save comments / log
  // await this.saveRejectionReason();

  // 🔑 THIS closes the task
  return {
    decision: "reject",
    context: {
      rejected: true
    }
  };
},
     postToSAP: function () {
    return new Promise((resolve, reject) => {

        const oPCModel = this.getView().getModel("pcModel");
        const aItems = oPCModel.getProperty("/LineItems") || [];

        if (!aItems.length) {
            reject("No data to send");
            return;
        }

        const aPayload = aItems.map(item => ({
            PROFITCENTER: item.profitcenter,
            CONTAREA: item.controllingarea,
            VALIDFROM: "20251219",
            VALIDTO: "20251231",
            PRCTR_NAME: item.name || "",
            LONG_TEXT: item.longText || "",
            IN_CHARGE: item.personresponsible || "",
            DEPARTMENT: item.segment || "",
            PRCTR_HIER_GRP: item.profitCentGroup || "",
            LANGUAGE: "EN",
            to_CompanyCodes: []
        }));

        this._sendToSAP(aPayload)
            .then(resolve)
            .catch(reject);
    });
},

_sendToSAP: function (aPayload) {
    const oModel = this.getOwnerComponent().getModel("postingModel");

    // new Promise((resolve, reject) => {
    //     oModel.read("/ET_PROFITPOSTSet", {
    //         urlParameters: { "$top": 1 },
    //         success: resolve,
    //         error: reject
    //     });
    // });

    return Promise.all(
        aPayload.map(oEntry => {
            return new Promise((resolve, reject) => {
                oModel.create("/ET_PROFITPOSTSet", oEntry, {
                    success: resolve,
                    error: reject
                });
            });
        })
    );
}




    });
});