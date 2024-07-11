sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/m/MessageBox",
        "sap/ui/core/Fragment",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/format/DateFormat",
        'sap/ui/export/library',
        'sap/ui/export/Spreadsheet',
        'sap/m/MessageToast',
        'sap/m/StandardListItem',
        'sap/ui/model/Filter',
        'sap/ui/model/FilterOperator',
        "sap/m/MessagePopover",
        "sap/m/MessageItem",
        "sap/m/Token",
    ],
    function (Controller, MessageBox, Fragment, JSONModel, DateFormat,
        exportLibrary, Spreadsheet, MessageToast, StandardListItem,
        Filter, FilterOperator, MessagePopover, MessageItem, Token) {
        "use strict";

        return Controller.extend("mdg.profitcenter.ui.profitcenterinitiatorui.controller.CreatePage", {
            onInit: async function () {

                //** Passing filters to remove empty data if presents 

                let VHModel = this.getOwnerComponent().getModel();
                let aFilterCC = new Filter("CompanyCode", FilterOperator.NE, " ");

                //** fetching company code data from capm service & setting it to ccmodel

                let CCData = await this.oDataPromise(VHModel, "CompanyCodeVH", aFilterCC);

                let CCModel = new JSONModel();
                CCModel.setData(CCData);
                this.getView().setModel(CCModel, "CCModel");

                //Download Excel Template

                let downloadExcelModel = new JSONModel(sap.ui.require.toUrl("assetmasterinitiatorui/model/ExcelSheetTemplate.json"));
                this.getView().setModel(downloadExcelModel, "ExcelTmpModel");

            },

            /** Promise to fetch data */


            /** function to trigger workflow */

            triggerWorkflowFn: async function (ReqId) {
                let commentData = this.getView().getModel("commentModel")?.getData();
                let definitionId = `mdg.assetmaster.myassetmasterworkflow`;
                let initialContext = {};
                initialContext.ReqId = this.reqId;   //NEWREQUEST
                initialContext.commentCollection = commentData;
                initialContext.requestType = ReqId;   //REQ Number
                let workflowPayload = {
                    definitionId: definitionId,
                    context: initialContext
                }
                let responseData = await new Promise((resolve, reject) => {
                    $.ajax({
                        url: this._getWorkflowRuntimeBaseURL() + "/workflow-instances",
                        method: "POST",
                        async: false,
                        contentType: "application/json",
                        headers: {
                            "X-CSRF-Token": this._fetchToken(),
                        },
                        data: JSON.stringify(workflowPayload),
                        success: function (result, xhr, data) {
                            resolve(result);
                            this.reqId = '';
                        }.bind(this),
                        error: function (request, status, error) {
                            reject(request);
                        },
                    });
                });
                return responseData;
            },
            _getWorkflowRuntimeBaseURL: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);

                return appModulePath + "/bpmworkflowruntime/v1";
            },
            _fetchToken: function (rules) {
                let fetchedToken, url;

                url = this._getWorkflowRuntimeBaseURL() + "/xsrf-token";

                jQuery.ajax({
                    url: url,
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

            /** Feed Input comment collection function */

            onPostComment: function () {
                var oFormat = DateFormat.getDateTimeInstance({ style: "medium" });
                var oComments = this.getView().getModel("commentModel");
                var oDate = new Date();
                var sDate = oFormat.format(oDate);
                // create new entry
                var sValue = oEvent.getParameter("value");
                var aComments = oComments.getData();
                var oEntry = {
                    // UserName: this.getOwnerComponent().currentUser,
                    UserName: "test@user.com",
                    Date: "" + sDate,
                    Text: sValue
                };
                aComments.unshift(oEntry);
                oComments.setData(aComments);
            },

            /** download excel template function */

            onPressDownloadTemplate: function () {
                let excelWorkBookData = this.getView().getModel("ExcelTmpModel").getData();
                const Workbook = XLSX.utils.book_new();
                excelWorkBookData.forEach(sheet => {
                    if (sheet.data.length > 0) {
                        const sheetData = XLSX.utils.aoa_to_sheet([Object.keys(sheet.data[0]), ...sheet.data.map(Object.values)]);
                        XLSX.utils.book_append_sheet(Workbook, sheetData, sheet.Name);
                    }
                });

                // Convert the workbook to binary format
                const excelBinary = XLSX.write(Workbook, { type: "binary" });

                // Trigger the download
                const blob = new Blob([this.s2ab(excelBinary)], { type: "application/octet-stream" });
                saveAs(blob, "assetmaster_template.xlsx"); // <-- Use saveAs from FileSaver.js 
            },

            s2ab: function (s) {
                const buf = new ArrayBuffer(s.length);
                const view = new Uint8Array(buf);
                for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
                return buf;
            },
        });
    }
);