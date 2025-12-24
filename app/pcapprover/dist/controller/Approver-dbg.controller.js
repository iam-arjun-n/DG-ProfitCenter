sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/DateFormat",
], (Controller, JSONModel, Fragment,DateFormat) => {
    "use strict";
    var that;
    return Controller.extend("com.deloitte.mdg.profitcenter.approver1.pcapprover.controller.Approver", {
        onInit() {
            that = this;
            this.commentAdded=false;
            debugger
            const oCCModel = new sap.ui.model.json.JSONModel([]);
            this.getView().setModel(oCCModel, "oCCModel");
            var oPCModel = new JSONModel();
            oPCModel.setData([]);
            this.getOwnerComponent().setModel(oPCModel, "oPCModel");
            var oComponentData = this.getOwnerComponent().getComponentData();
            console.log("Component startupParameters:", oComponentData.startupParameters);
            this.instanceID = oComponentData.startupParameters.taskModel.oData.InstanceID;
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
                    "$expand": "NAV_WORKFLOW_ITEMSET,NAV_WORKFLOW_COMMENTS,NAV_WORKFLOW_ITEMSET/NAV_WORKFLOW_COMPANYCODE"
                },
                success: (oData) => {
                    // Prepare JSON model for table
                    var structuredData = {
                        LineItems: oData.NAV_WORKFLOW_ITEMSET?.results || []

                    };
                    structuredData.LineItems.forEach(oItem => {
                        oItem.companyCode = (oItem.NAV_WORKFLOW_COMPANYCODE?.results || []).map(cc => ({
                            CompanyCode: cc.companycode,
                            CompanyCodeName: cc.companyname,
                            Assigned: cc.assigned
                        }));
                    });

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

        onView: function () {
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

            var oCCModel = this.getView().getModel("oCCModel");
            oCCModel.setData(oSelectedRow.companyCode);

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
            if(!this.commentAdded){
                sap.m.MessageBox.error(
        "Please add a comment before proceeding."
    );
                return;
            }
            const inboxAPI = this.getOwnerComponent()
                .getComponentData()
                .startupParameters
                .inboxAPI;

            try {
                // 1️⃣ Post to SAP
                const aResponses = await this.postToSAP();

                // 2️⃣ Build success message
                const aProfitCenters = aResponses.map(r => r.PROFITCENTER).join(", ");

                // 3️⃣ Show popup FIRST
                sap.m.MessageBox.success(
                    `Profit Center(s) created successfully:\n${aProfitCenters}`,
                    {
                        title: "Approval Successful",
                        onClose: () => {
                            // 4️⃣ Complete BPA task AFTER popup
                            // inboxAPI.updateTask({
                            //     decision: "approve",
                            //     context: {
                            //         Approve: "X"
                            //     }
                            // });

                            this.completeTask("approve");
                        }
                    }
                );

            } catch (e) {
                sap.m.MessageBox.error(
                    "Posting to SAP failed. Task not completed."
                );
            }
        },

        onPostComment: function (oEvent) {
            var oFormat = DateFormat.getDateTimeInstance({ style: "medium" });
            var oComments = this.getView().getModel("commentModel");
            var oDate = new Date();
            var sDate = oFormat.format(oDate);
            // create new entry
            var sValue = oEvent.getParameter("value");
            var aComments = oComments.getData();
            var oEntry = {
                Username: this.getOwnerComponent()?.getModel("userModel")?.getProperty("/currentUser") || "test@user.com",
                Date: "" + sDate,
                Comment: sValue,
            };
            console.log(oEntry);
            aComments.unshift(oEntry);
            oComments.setData(aComments);
            this.commentAdded=true;
        },
        onReject: function () {
            if(!this.commentAdded){
                sap.m.MessageBox.error(
        "Please add a comment before proceeding."
    );
                return;
            }
            this.rejectTask();
            sap.m.MessageToast.show("Rejected successfully");
        },

        rejectTask: function (sTaskId, sReason) {
            return this.completeTask("reject");
        },

        completeTask: function (approvalStatus) {
            // this.getModel("context").setProperty("/approved", approvalStatus);
            if (approvalStatus) {
                this._patchTaskInstance(approvalStatus);
            }
            return this._refreshTaskList();
        },
        _patchTaskInstance: function (status) {
            // let comments = this.getModel("commentModel").getData();
            // this.getModel("context").setProperty("/Comments", comments);
            //  this.getModel("context").setProperty("/Comments",this.getModel("commentModel").getData());
            var data = {
                status: "COMPLETED",
                decision: status
            };
            this.getView().setBusy(true);
            jQuery.ajax({
                url: this._getTaskInstancesBaseURL(),
                method: "PATCH",
                contentType: "application/json",
                async: false,
                data: JSON.stringify(data),
                headers: {
                    "X-CSRF-Token": this._fetchToken(),
                },
                success: () => {
                    this.getView().setBusy(false);
                    this.updateWorkflowStatus(status);
                },
                error: (e) => {
                    this.getView().setBusy(false);

                }
            });
        },
        updateWorkflowStatus: function (status) {
            let oModel = this.getView().getModel("mainServiceModel");
            let CreatedBy = this.getOwnerComponent()?.getModel("userModel")?.getProperty("/currentUser") || "defaultUser";
            let reqID = this.reqId;
            let payload;
            if(status==="approve"){
                payload = {
                Status: "Completed",
                ApprovedOn: new Date(),
                ApprovedBy: CreatedBy
            }
            }
            else if(status==="reject"){
                payload={Status:"Rejected"}
            }
            
            oModel.update(`/ETY_WORKFLOW_HEADERSet('${reqID}')`, payload, {
                success: function () {
                    resolve();
                },
                error: function (error) {
                    reject(error);
                }
            });
        },
        _getTaskInstancesBaseURL: function () {
            return (
                this._getWorkflowRuntimeBaseURL() +
                "/task-instances/" +
                this.getTaskInstanceID()
            );
        },
        _getWorkflowRuntimeBaseURL: function () {
            var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);

            return appModulePath + "/bpmworkflowruntime/v1";
        },

        getTaskInstanceID: function () {
            // return this.getModel("task").getData().InstanceID;
            return this.instanceID;
        },


        _fetchToken: function () {
            var fetchedToken;

            jQuery.ajax({
                url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
                method: "GET",
                async: false,
                headers: {
                    "X-CSRF-Token": "Fetch",
                },
                success(result, xhr, data) {
                    fetchedToken = data.getResponseHeader("X-CSRF-Token");
                },
            });
            return fetchedToken;
        },

        _refreshTaskList: function () {
            // this.getInboxAPI().updateTask("NA", this.getTaskInstanceID());
            // this.getOwnerComponent().getComponentData().inboxAPI.updateTask("NA");
            var oComponentData = this.getOwnerComponent().getComponentData();
            oComponentData.startupParameters.inboxAPI.updateTask("NA", this.getTaskInstanceID());
            // this.getOwnerComponent().getComponentData().onTaskUpdate();
        },
        getInboxAPI: function () {
            var startupParameters = this.getOwnerComponent().getComponentData().startupParameters;
            return startupParameters.inboxAPI;
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
                    VALIDFROM: this.convertToYYYYMMDD(item.analysisPeriodValidFrom),
                    VALIDTO: this.convertToYYYYMMDD(item.analysisPeriodValidTo),
                    PRCTR_NAME: item.name || "",
                    LONG_TEXT: item.longText || "",
                    IN_CHARGE: item.personresponsible || "",
                    DEPARTMENT: item.segment || "",
                    PRCTR_HIER_GRP: item.profitCentGroup || "",
                    LANGUAGE: "EN",
                    to_CompanyCodes: (item.companyCode || []).map(i => ({
                        "COMPCODE": i.CompanyCode,
                        "ASSIGN_TO_PRCTR": i.Assigned === true ? "X" : ""
                    }))
                }));

                this._sendToSAP(aPayload)
                    .then(resolve)
                    .catch(reject);
            });
        },

        convertToYYYYMMDD: function (sDate) {
            if (!sDate) return "";

            const [dd, MM, yyyy] = sDate.split("-");
            return `${yyyy}${MM}${dd}`;
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
                            success: function (oResponse) {
                                resolve(oResponse); // <-- SAP response
                            },
                            error: reject
                        });
                    });
                })
            );
        }




    });
});