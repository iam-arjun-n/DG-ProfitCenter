sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    "sap/ui/export/library",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "sap/m/StandardListItem",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "sap/m/Token",
  ],
  function (
    Controller,
    MessageBox,
    Fragment,
    JSONModel,
    DateFormat,
    exportLibrary,
    Spreadsheet,
    MessageToast,
    StandardListItem,
    Filter,
    FilterOperator,
    MessagePopover,
    MessageItem,
    Token
  ) {
    "use strict";

    return Controller.extend(
      "mdg.profitcenter.ui.profitcenterinitiatorui.controller.CreatePage",
      {
        onInit: async function () {

          const oCCModel = new sap.ui.model.json.JSONModel([]);
          this.getView().setModel(oCCModel, "oCCModel");

          var oComments = new JSONModel();
          oComments.setData([]);
          this.getOwnerComponent().setModel(oComments, "commentModel");
          this.createWFModel();
          // this.onSelectionChange();
          //** Passing filters to remove empty data if presents

          this._oMessagePopover = new sap.m.MessagePopover({
            items: {
              path: 'messagefrag>/',
              template: new sap.m.MessagePopoverItem({
                title: '{messagefrag>message}',
                subtitle: '{messagefrag>additionalText}',
                type: '{messagefrag>type}'
              })
            }
          });
          this.getView().addDependent(this._oMessagePopover);

          this.oMessageManager = sap.ui.getCore().getMessageManager();

          this.getView().setModel(this.oMessageManager.getMessageModel(), "messagefrag");

          this.oControlMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();

          let VHModel = this.getOwnerComponent().getModel();
          let aFilterCC = new Filter("CompanyCode", FilterOperator.NE, " ");

          //** fetching company code data from capm service & setting it to ccmodel

          // let CCData = await this.oDataPromise(
          //   VHModel,
          //   "CompanyCodeVH",
          //   aFilterCC
          // );

          let pcModel = new JSONModel();
          pcModel.setData(pcModel);
          this.getView().setModel(pcModel, "pcModel");

          //Download Excel Template

          let downloadExcelModel = new JSONModel(
            sap.ui.require.toUrl(
              "assetmasterinitiatorui/model/ExcelSheetTemplate.json"
            )
          );
          this.getView().setModel(downloadExcelModel, "ExcelTmpModel");
        },

        onControllingAreaChange: function (oEvent) {
          const oTable = this.byId("_IDCreatePCTable1");
          oTable.setBusyIndicatorDelay(0); // show immediately
          oTable.setBusy(true);
          const sKOKRS = this.byId("controllingarea").getValue();

          const oTableModel = this.getView().getModel("oCCModel");

          if (!sKOKRS) {
            oTableModel.setData([]);
            oTable.setBusy(false);
            return;
          }

          const oODataModel = this.getOwnerComponent()
            .getModel("ZMaterialModel");

          // SAP logon language (EN, DE, etc.)
          const sLanguage = 'EN';

          const aFilters = [
            new sap.ui.model.Filter("ControllingArea", sap.ui.model.FilterOperator.EQ, sKOKRS),
            new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, 'EN')
          ];

          oODataModel.read("/I_CompanyCode", {
            filters: aFilters,
            success: (oData) => {
              // Bind ALL returned company codes
              oTableModel.setData(oData.results || []);
              oTable.setBusy(false);
            },
            error: () => {
              oTableModel.setData([]);
              oTable.setBusy(false);
            }
          });
        },
        /** Promise to fetch data */

        /** to create new PC data */

        addProfitCenterobj: async function () {

          this._editIndex = undefined; // store index for updating
          this._isEditMode = false;
          this._clearValueStates();
          this._clearMessageManager();
          this._mode = "A"; //add
          let oView = this.getView();

          const today = new Date();
          const maxDate = new Date(9999, 11, 31);  // month 11 = December

          let initialisePCModel = {
            profitcenter: "",
            controllingarea: "1100",
            name: "",
            analysisPeriodValidFrom: today,
            analysisPeriodValidTo: maxDate,
            longText: "",
            personresponsible: "",
            profitCentGroup: "",
            segment: "NORTH",
            companycode: "",
            companyname: "",
            assigned: false,
            lockindicator: false,
            enableTabs: false,
            createdBy: '',
            enteredOn: new Date()
          };

          //open the fragment

          if (!this._PCFragment) {
            this._PCFragment = await Fragment.load({
              id: oView.getId(),
              name: "mdg.profitcenter.ui.profitcenterinitiatorui.fragments.CreatePC",
              controller: this,
            });
            oView.addDependent(this._PCFragment);
          }



          //initialise data model
          oView.setModel(new JSONModel(initialisePCModel), "oPCModel");
          var oPCModel = this.getView().getModel("oPCModel");

          if (oPCModel.getProperty("/controllingarea")) {
            this.onControllingAreaChange();
          }
          this.byId("dAddProfitCenter").setTitle(`Add Profit Center`);

          this._PCFragment.open();
          //           const oIconTabBar = Fragment.byId(oView.getId() + "idIconTabBar");
          // oIconTabBar.setSelectedKey("ProfitCenterIS");

          //           if (!this._PCFragment) {
          //     this._PCFragment = await Fragment.load({
          //         id: oView.getId(),  
          //         name: "mdg.profitcenter.ui.profitcenterinitiatorui.fragments.CreatePC",
          //         controller: this,
          //     });
          //     oView.addDependent(this._PCFragment);
          // }

          // // OPEN the dialog
          // this._PCFragment.open();

          // // Now wait for rendering
          // setTimeout(() => {
          //     const oIconTabBar = Fragment.byId(oView.getId(), "idIconTabBar");
          //     oIconTabBar.setSelectedKey("ProfitCenterIS");
          // }, 0);

        },

        editProfitCenterClassObj: function () {
          const oTable = this.byId("_IDProfitCenterTable");
          const oSelectedItem = oTable.getSelectedItem();
          if (!oSelectedItem) {
            sap.m.MessageToast.show("Please select a record to edit.");
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
          this.openEdit(oSelectedData, sPath);
        },

        openEdit: function (oSelectedData, sPath) {
          var osharedModel = this.getView().getModel("pcModel");
          osharedModel.setProperty("/SelectedItem", oSelectedData);
          // osharedModel.setData(oSelectedData);
          // var Router = this.getOwnerComponent().getRouter();
          // Router.navTo("Edit");
          var oMainModel = this.getView().getModel("pcModel");
          var aLineItems = oMainModel.getProperty("/LineItems") || [];
          var oSelectedRow = aLineItems[this._editIndex] || {};

          var oLocalModel = this.getView().getModel("oPCModel");
          if (oLocalModel) {
            oLocalModel.setData(oSelectedRow);
          }

          var oCCModel = this.getView().getModel("oCCModel");
          oCCModel.setData(oSelectedRow.companyCode);
          let oView = this.getView();
          if (!this._PCFragment) {
            this._PCFragment = Fragment.load({
              id: oView.getId(),
              name: "mdg.profitcenter.ui.profitcenterinitiatorui.fragments.CreatePC",
              controller: this,
            });
            oView.addDependent(this._PCFragment);
          }



          //initialise data model

          this.byId("dAddProfitCenter").setTitle(`Add Profit Center`);

          this._PCFragment.open();
        },

        /** to close /cancel fragment */

        onCancelPCFragment() {
          this._PCFragment.close();
        },

        /*
         * Function - handleMessagePopoverPress
         * Type - Event Hanlder for Message Popover button
         * Logics:
         *       1. Toggling between open and close state of Message Popover
         */
        handleMessagePopoverPressFrag: function (oEvent) {
          if (!this._oMessagePopover) {
            console.error("MessagePopover not created");
            return;
          }

          this._oMessagePopover.openBy(oEvent.getSource());
        },

        /*
         * Function - createMessageModel
         * Type - Custom Method
         * Logics:
         *       1. Initializing the Message Model for Message Popover
         */
        // createMessageModelFrag: function () {
        //   //Message Template
        //   let oMessageTemplate = new MessageItem({
        //     type: "{messagefrag>type}",
        //     title: "{messagefrag>title}",
        //     activeTitle: "{messagefrag>active}",
        //     description: "{messagefrag>description}",
        //     subtitle: "{messagefrag>subtitle}",
        //     counter: "{messagefrag>counter}",
        //   });
        //   /** Message Pop Over */
        //   this.oMessagePopoverFrag = new MessagePopover({
        //     items: {
        //       path: "messagefrag>/messages",
        //       template: oMessageTemplate,
        //     },
        //   });
        //   let oModel = new JSONModel();

        //   this.getView().setModel(oModel, "messagefrag");
        //   this.getView().getModel("messagefrag").setProperty("/messagesLength", 0);
        //   this.getView().getModel("messagefrag").setProperty("/messages", []);
        //   this.byId("bMsgRec").addDependent(this.oMessagePopoverFrag);
        // },

        /** whnever an input changes */

        onInputValueChange: function (oEvent) {
          if (!oEvent) {
            return;
          }
          // 🔑 Ignore change triggered by value help opening
          if (oEvent.getParameter("valueHelpRequest")) {
            return;
          }

          const oPCModel = this.getView().getModel("oPCModel");

          const sPC = oPCModel.getProperty("/profitcenter");
          const sKOKRS = oPCModel.getProperty("/controllingarea");

          // Enable tabs only if both exist
          oPCModel.setProperty("/enableTabs", !!(sPC && sKOKRS));

          // Call only if controlling area input changed
          if (oEvent.getSource().getId().includes("controllingarea") && sKOKRS) {
            this.onControllingAreaChange(oEvent);
          }
        },

        /** function to trigger workflow */

        // triggerWorkflowFn: async function (ReqId) {
        //   let commentData = this.getView().getModel("commentModel")?.getData();
        //   let definitionId = `mdg.assetmaster.myassetmasterworkflow`;
        //   let initialContext = {};
        //   initialContext.ReqId = this.reqId; //NEWREQUEST
        //   initialContext.commentCollection = commentData;
        //   initialContext.requestType = ReqId; //REQ Number
        //   let workflowPayload = {
        //     definitionId: definitionId,
        //     context: initialContext,
        //   };
        //   let responseData = await new Promise((resolve, reject) => {
        //     $.ajax({
        //       url: this._getWorkflowRuntimeBaseURL() + "/workflow-instances",
        //       method: "POST",
        //       async: false,
        //       contentType: "application/json",
        //       headers: {
        //         "X-CSRF-Token": this._fetchToken(),
        //       },
        //       data: JSON.stringify(workflowPayload),
        //       success: function (result, xhr, data) {
        //         resolve(result);
        //         this.reqId = "";
        //       }.bind(this),
        //       error: function (request, status, error) {
        //         reject(request);
        //       },
        //     });
        //   });
        //   return responseData;
        // },
        // _getWorkflowRuntimeBaseURL: function () {
        //   var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
        //   var appPath = appId.replaceAll(".", "/");
        //   var appModulePath = jQuery.sap.getModulePath(appPath);

        //   return appModulePath + "/bpmworkflowruntime/v1";
        // },
        // _fetchToken: function (rules) {
        //   let fetchedToken, url;

        //   url = this._getWorkflowRuntimeBaseURL() + "/xsrf-token";

        //   jQuery.ajax({
        //     url: url,
        //     method: "GET",
        //     async: false,
        //     headers: {
        //       "X-CSRF-Token": "Fetch",
        //     },
        //     success(result, xhr, data) {
        //       fetchedToken = data.getResponseHeader("X-CSRF-Token");
        //     },
        //   });
        //   return fetchedToken;
        // },

        /** Feed Input comment collection function */

        onPostComment: function (oEvent) {
          var oFormat = DateFormat.getDateTimeInstance({ style: "medium" });
          var oComments = this.getView().getModel("commentModel");
          var oDate = new Date();
          var sDate = oFormat.format(oDate);
          // create new entry
          var sValue = oEvent.getParameter("value");
          var aComments = oComments.getData();
          var oEntry = {
            UserName: this.getOwnerComponent()?.getModel("userModel")?.getProperty("/currentUser") || "test@user.com",
            Date: "" + sDate,
            Text: sValue,
          };
          console.log(oEntry);
          aComments.unshift(oEntry);
          oComments.setData(aComments);
        },

        onPageSave: function () {
          const oPCModel = this.getView().getModel("pcModel");

          if (!oPCModel) {
            console.error("pcModel is not defined");
            return;
          }

          // Clear old validation messages
          this.oMessageManager.removeAllMessages();

          // Field refs
          const oProfitCenter = this.byId("profitcenter");
          const oControllingArea = this.byId("controllingarea");
          const oName = this.byId("name");
          const oPersonResp = this.byId("personresponsible");
          const oPCGroup = this.byId("profitcentergroup");
          const aCompanyCodes = this.getView().getModel("oCCModel").getData() || [];

          // Check if at least one company code is assigned
          const bAnyAssigned = aCompanyCodes.some(cc => cc.Assigned === true);


          let bIsValid = true;

          // Helper function for validation
          const validateField = (oField, sFieldName) => {
            if (!oField.getValue().trim()) {
              bIsValid = false;

              this.oMessageManager.addMessages(
                new sap.ui.core.message.Message({
                  message: `${sFieldName} is mandatory`,
                  type: sap.ui.core.MessageType.Error,
                  target: oField.getId(),
                  processor: oPCModel
                })
              );
            }
          };

          // Mandatory field validations
          // validateField(oProfitCenter, "Profit Center");
          // validateField(oControllingArea, "Controlling Area");
          // validateField(oName, "Name");
          // validateField(oPersonResp, "Person Responsible");
          // validateField(oPCGroup, "Profit Center Group");

          // If validation failed → show popover
          // if (!bIsValid) {
          this.byId("bMsgRec").firePress();  // Auto open popover
          let valid = true;

          valid &= this.validateRequired(this.byId("profitcenter"), "Profit Center is required");
          valid &= this.validateRequired(this.byId("controllingarea"), "Controlling Area is required");
          valid &= this.validateRequired(this.byId("name"), "Name is required");
          valid &= this.validateRequired(this.byId("personresponsible"), "Person Responsible is required");
          valid &= this.validateRequired(this.byId("profitcentergroup"), "Profit Center Group is required");

          if (!bAnyAssigned) {
            bIsValid=true;
            valid=false;
            this.oMessageManager.addMessages(
  new sap.ui.core.message.Message({
    message: "At least one Company Code must be assigned",
    type: sap.ui.core.MessageType.Error,
    target: "/CompanyCode", // logical target
    processor: this.oControlMessageProcessor
  })
);

          }

            if (!valid) {
              // Auto-open message popover or show toast
              MessageToast.show("Please correct the errors.");
              return; // stop save
            };


            // If valid → proceed with save
            let aLineItems = oPCModel.getProperty("/LineItems") || [];
            // const aCompanyCodes =this.getView().getModel("oCCModel").getData();


            let oSelectedItem = {
              profitcenter: oProfitCenter.getValue(),
              controllingarea: oControllingArea.getValue(),
              analysisPeriodValidFrom: this.byId("_IDCreatePCDatePicker1").getValue(),
              analysisPeriodValidTo: this.byId("_IDCreatePCDatePicker2").getValue(),
              name: oName.getValue(),
              longText: this.byId("longtext").getValue(),
              personresponsible: oPersonResp.getValue(),
              profitCentGroup: oPCGroup.getValue(),
              segment: this.byId("segment").getValue(),
              lockindicator: this.byId("_IDCreatePCCheckBox1").getSelected(),
              createdBy: this.byId("createdby").getValue(),
              enteredOn: this.byId("_IDCreatePCDatePicker3").getValue(),
              companyCode: aCompanyCodes
            };

            if (this._isEditMode) {
              aLineItems[this._editIndex] = oSelectedItem;
            } else {
              // Push new item
              aLineItems.push({ ...oSelectedItem });
            }

            // Update model
            oPCModel.setProperty("/SelectedItem", oSelectedItem);
            oPCModel.setProperty("/LineItems", aLineItems);

            // Close popup
            this._PCFragment.close();

            MessageToast.show("Profit Center saved successfully!");
          },


          validateRowSelection: function () {
            let oTable = this.byId("_IDProfitCenterTable");  // your table ID
            let aSelected = oTable.getSelectedItems();

            if (aSelected.length === 0) {
              // Disable buttons
              this.byId("btnEdit").setEnabled(false);
              this.byId("btnDelete").setEnabled(false);
              return false;
            }

            // Enable buttons when row selected
            this.byId("bEdit").setEnabled(true);
            this.byId("bDel").setEnabled(true);
            return true;
          },
          onSelectionChange: function () {
            this.validateRowSelection();
          },
          validateRequired: function (oInput, errorMessage) {
            const value = oInput.getValue();

            if (!value) {
              this.oMessageManager.addMessages(
                new sap.ui.core.message.Message({
                  message: errorMessage,
                  type: sap.ui.core.MessageType.Error,
                  target: oInput.getId() + "/value",  // required for inline error
                  processor: this.oControlMessageProcessor
                })
              );

              return false;
            }
            return true;
          },

          _clearValueStates: function () {
            const oFragment = this._PCFragment;

            if (oFragment) {
              // Loop over **all controls inside the fragment**
              oFragment.findAggregatedObjects(true, function (oControl) {
                if (oControl.setValueState) {
                  oControl.setValueState("None");
                  oControl.setValueStateText("");
                }
              });
            }
          },

          _clearMessageManager: function () {
            sap.ui.getCore().getMessageManager().removeAllMessages();
          },

          deleteProfitCenterObj: function () {
            let oTable = this.byId("_IDProfitCenterTable");
            let oPCModel = this.getView().getModel("pcModel");

            let aSelected = oTable.getSelectedItems();
            if (aSelected.length === 0) {
              MessageToast.show("Please select a row to delete");
              return;
            }

            let index = oTable.indexOfItem(aSelected[0]);

            MessageBox.confirm("Are you sure you want to delete this Profit Center?", {
              actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
              onClose: (action) => {
                if (action === MessageBox.Action.OK) {
                  let items = oPCModel.getProperty("/LineItems");

                  items.splice(index, 1);

                  oPCModel.setProperty("/LineItems", items);
                  oPCModel.setProperty("/SelectedItem", {});

                  // Reset buttons
                  this.byId("bEdit").setEnabled(false);
                  this.byId("bDel").setEnabled(false);

                  MessageToast.show("Deleted successfully");
                }
              }
            });
          },

          /** download excel template function */

          // onPressDownloadTemplate: function () {
          //   let excelWorkBookData = this.getView()
          //     .getModel("ExcelTmpModel")
          //     .getData();
          //   const Workbook = XLSX.utils.book_new();
          //   excelWorkBookData.forEach((sheet) => {
          //     if (sheet.data.length > 0) {
          //       const sheetData = XLSX.utils.aoa_to_sheet([
          //         Object.keys(sheet.data[0]),
          //         ...sheet.data.map(Object.values),
          //       ]);
          //       XLSX.utils.book_append_sheet(Workbook, sheetData, sheet.Name);
          //     }
          //   });

          //   // Convert the workbook to binary format
          //   const excelBinary = XLSX.write(Workbook, { type: "binary" });

          //   // Trigger the download
          //   const blob = new Blob([this.s2ab(excelBinary)], {
          //     type: "application/octet-stream",
          //   });
          //   saveAs(blob, "assetmaster_template.xlsx"); // <-- Use saveAs from FileSaver.js
          // },

          // s2ab: function (s) {
          //   const buf = new ArrayBuffer(s.length);
          //   const view = new Uint8Array(buf);
          //   for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
          //   return buf;
          // },

          onPressDownloadTemplate: function () {
    const oModel = this.getView().getModel("mainServiceModel");

    oModel.callFunction("/downloadTemplate", {
        method: "POST",

        success: function (oData) {

            let base64 = oData.downloadTemplate;

            // 🔑 FIX: Convert URL-safe base64 to standard base64
            base64 = base64
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            // Pad if required
            while (base64.length % 4 !== 0) {
                base64 += "=";
            }

            const binary = atob(base64);

            const len = binary.length;
            const bytes = new Uint8Array(len);

            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            const blob = new Blob(
                [bytes],
                { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
            );

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Profit Center Mass Upload Template.xlsx";
            a.click();
            URL.revokeObjectURL(url);
        },

        error: function () {
            sap.m.MessageToast.show("Download failed");
        }
    });
},
          onValueHelpRequestProfitCenter: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this.openF4Dialog("Profit Center", [], oEvent.getSource().getId());

            let model = this.getOwnerComponent().getModel("profitCenterModel"),
              entityset = "/I_ProfitCenterText",
              // sPlant = this.getView().getModel("pvModel1").getProperty("/SelectedItem/Plant"),
              filters = [new Filter("Language", FilterOperator.EQ, 'EN')];

            var sMaterialFormattedData = this.getView().getModel("profitCenterModel").getProperty("/MaterialFormattedData");
            if (sMaterialFormattedData === undefined) {
              this.getF4Data(model, entityset, filters).then(data => {
                let formattedData = data?.results.map(item => ({
                  title: item.ProfitCenter,
                  description: item.ProfitCenterName
                }));
                this.getView().getModel("F4Model").setData(formattedData);
                this.openF4Dialog("Profit Center", formattedData, oEvent.getSource().getId());
                sap.ui.core.BusyIndicator.hide();
                this.onInputValueChange();
              }).catch(err => {
                MessageBox.error("Failed to load data for profit center: " + err.message);
              });
            } else {
              this.openF4Dialog("Profit Center", sMaterialFormattedData, oEvent.getSource().getId());
              sap.ui.core.BusyIndicator.hide();
            }
          },

          onValueHelpRequestControllingArea: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this.openF4Dialog("Controlling Area", [], oEvent.getSource().getId());

            let model = this.getOwnerComponent().getModel("profitCenterModel"),
              entityset = "/I_ProfitCenterText",
              sProfitCenter = this.getView().getModel("oPCModel").getProperty("/profitcenter"),
              filters = [
                new sap.ui.model.Filter("ProfitCenter", sap.ui.model.FilterOperator.NE, sProfitCenter),
                new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, 'EN')
              ];

            var sMaterialFormattedData = this.getView().getModel("profitCenterModel").getProperty("/MaterialFormattedData");
            if (sMaterialFormattedData === undefined) {
              this.getF4Data(model, entityset, filters).then(data => {
                let formattedData = data?.results.map(item => ({
                  title: item.ControllingArea,
                  description: item.ControllingArea
                }));
                this.getView().getModel("F4Model").setData(formattedData);
                this.openF4Dialog("Controlling Area", formattedData, oEvent.getSource().getId());
                sap.ui.core.BusyIndicator.hide();
                this.onInputValueChange();
              }).catch(err => {
                MessageBox.error("Failed to load data for Controlling Area: " + err.message);
              });
            } else {
              this.openF4Dialog("Controlling Area", sMaterialFormattedData, oEvent.getSource().getId());
              sap.ui.core.BusyIndicator.hide();
            }
          },

          onValueHelpRequestSegment: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this.openF4Dialog("Segment", [], oEvent.getSource().getId());

            let model = this.getOwnerComponent().getModel("profitCenterModel"),
              entityset = "/I_SegmentText",
              // sProfitCenter = this.getView().getModel("oPCModel").getProperty("/profitcenter"),
              filters = [
                new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, 'EN')
              ];

            var sMaterialFormattedData = this.getView().getModel("profitCenterModel").getProperty("/MaterialFormattedData");
            if (sMaterialFormattedData === undefined) {
              this.getF4Data(model, entityset, filters).then(data => {
                let formattedData = data?.results.map(item => ({
                  title: item.Segment,
                  description: item.SegmentName
                }));
                this.getView().getModel("F4Model").setData(formattedData);
                this.openF4Dialog("Segment", formattedData, oEvent.getSource().getId());
                sap.ui.core.BusyIndicator.hide();

              }).catch(err => {
                MessageBox.error("Failed to load data for segment: " + err.message);
              });
            } else {
              this.openF4Dialog("Segment", sMaterialFormattedData, oEvent.getSource().getId());
              sap.ui.core.BusyIndicator.hide();
            }
          },

          onValueHelpRequestProfitCenterGroup: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this.openF4Dialog("Profit Center Group", [], oEvent.getSource().getId());

            let model = this.getOwnerComponent().getModel("profitCenterGroupModel"),
              entityset = "/ZI_DDSETNAME",
              sControllingArea = this.getView().getModel("oPCModel").getProperty("/controllingarea"),
              filters = [
                new sap.ui.model.Filter("subclass", sap.ui.model.FilterOperator.EQ, sControllingArea)
              ];

            var sMaterialFormattedData = this.getView().getModel("profitCenterGroupModel").getProperty("/MaterialFormattedData");
            if (sMaterialFormattedData === undefined) {
              this.getF4Data(model, entityset, filters).then(data => {
                let formattedData = data?.results.map(item => ({
                  title: item.setname,
                  description: item.Description
                }));
                this.getView().getModel("F4Model").setData(formattedData);
                this.openF4Dialog("Profit Center Group", formattedData, oEvent.getSource().getId());
                sap.ui.core.BusyIndicator.hide();

              }).catch(err => {
                MessageBox.error("Failed to load data for Profit Center Group: " + err.message);
              });
            } else {
              this.openF4Dialog("Profit Center Group", sMaterialFormattedData, oEvent.getSource().getId());
              sap.ui.core.BusyIndicator.hide();
            }
          },

          getF4Data: function (model, entityset, oFilters) {
            return new Promise((resolve, reject) => {
              model.read(entityset, {
                filters: oFilters,
                success: data => resolve(data),
                error: err => reject(err)
              });
            });
          },

          openF4Dialog: function (F4Title, formattedData, inputId) {
            this.inputId = inputId;
            if (!this.F4Dialog) {
              Fragment.load({
                id: this.getView().getId(),
                name: "mdg.profitcenter.ui.profitcenterinitiatorui.fragments.F4Dialog"
              }).then(oDialog => {
                this.F4Dialog = oDialog;
                this.getView().addDependent(oDialog);
                this._setF4DialogData(oDialog, formattedData, F4Title);
              }).catch(err => {
                MessageBox.error("Failed to load F4 dialog: " + err.message);
              });
            } else {
              this._setF4DialogData(this.F4Dialog, formattedData, F4Title);
            }
          },

          _setF4DialogData: function (oDialog, formattedData, title) {
            const oModel = new sap.ui.model.json.JSONModel(formattedData);
            this.getView().setModel(oModel, "F4Model");
            oDialog.setTitle(title);
            oDialog.attachSearch(this._handleValueHelpSearch, this);
            oDialog.attachLiveChange(this._handleValueHelpSearch, this);
            oDialog.attachConfirm(this._handleValueHelpClose, this);
            oDialog.attachCancel(this._handleValueHelpClose, this);
            oDialog.open();
          },

          _handleValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter({
              filters: [
                new Filter("title", FilterOperator.Contains, sValue),
                new Filter("description", FilterOperator.Contains, sValue)
              ],
              and: false
            });

            // Apply the filter to the model
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(oFilter);

            console.log("Filtered items:", oBinding.oList); // raw list in binding
            console.log("Current context length:", oBinding.getLength()); // visible items after filter
          },
          _handleValueHelpClose: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
              const sSelectedKey = oSelectedItem.getTitle();
              const oInput = this.byId(this.inputId);
              let sUsage = "";
              const match = oSelectedItem.getDescription().match(/\d+/);
              if (match) {
                sUsage = match[0];  // "1"
              }
              if (oInput) {
                oInput.setValue(sSelectedKey);
              }
              if (this.inputId === "application-Create-show-component---Create--altBOM") {
                this.byId("bomUsage").setValue(sUsage);
              }
            }
            const oDialog = oEvent.getSource();
            if (oDialog && typeof oDialog.close === "function") {
              oDialog.close();
            }
            const oPCModel = this.getView().getModel("oPCModel");

            if (oPCModel.getProperty("/controllingarea")) {
              this.onControllingAreaChange();
            }
          },

          onNameChange: function (oEvent) {
            const oInput = oEvent.getSource();
            let value = oEvent.getParameter("value");

            // Allow only letters + numbers
            value = value.replace(/[^a-zA-Z0-9]/g, "");

            // Update back (removes special characters live)
            oInput.setValue(value);

            // Validation: if empty or invalid, show error state
            // if (value.length === 0) {
            //     oInput.setValueState("Error");
            //     oInput.setValueStateText("Name cannot be empty and must be alphanumeric.");
            // } else {
            //     oInput.setValueState("None");
            // }
          },

          initiateApprovalProcess: async function () {
            try {
              if (!this._oBusyDialog) {
                this._oBusyDialog = new sap.m.BusyDialog({ text: "Initiating approval process..." });
              }
              this._oBusyDialog.open();

              // Ensure mandatory comments are provided
              let commentModel = this.getView().getModel("commentModel");
              let comments = commentModel.getData();
              if (comments.length === 0) {
                this._oBusyDialog.close();
                MessageBox.information("Comments are mandatory!");
                return;
              }

              // Post data to generate Request ID
              this._oBusyDialog.setText("Posting data...");
              let reqID = await this.postData();
              if (!reqID) throw new Error("Failed to generate Request ID.");

              // Initiate workflow instance with the generated Request ID
              this._oBusyDialog.setText("Starting workflow...");
              let workflowSuccess = await this.startWorkflowInstance(reqID);
              if (!workflowSuccess) throw new Error("Failed to initiate workflow.");

              // Update backend with the workflow instance ID
              this._oBusyDialog.setText("Updating workflow header...");
              let workflowData = this.getView().getModel("workflowModel").getData();
              let workflowInstanceId = workflowData.apiResponse.id;
              await this.updateWorkflowHeader(reqID, workflowInstanceId);

              // Close BusyDialog and show success message
              this._oBusyDialog.close();
              this.showSuccessMessage(reqID);

            } catch (error) {
              // Handle errors gracefully
              if (this._oBusyDialog) {
                this._oBusyDialog.close();
              }
              MessageBox.error(error.message || "An error occurred during the process.");
              console.error("Error:", error);
            }
          },

          postData: function () {
            let that = this;
            return new Promise((resolve, reject) => {
              let payload = that.PayloadData();
              let model = that.getView().getModel("mainServiceModel");
              model.create("/ETY_WORKFLOW_HEADERSet", payload, {
                success: function (data) {
                  resolve(data.ReqId);
                },
                error: function (response) {
                  reject(response);
                }
              });
            });
          },

          startWorkflowInstance: function (reqID) {
            return new Promise((resolve, reject) => {
              let definitionId = "eu10.data-guardian-development-wvrdlvx6.profitcenter.approvalProcess";
              let commentModel = this.getView().getModel("commentModel");
              let comments = commentModel.getData();
              let initialContext = { reqno: reqID, Type: "Create", Comment: comments };
              let url = this.getBaseURL() + "/workflow-instances";

              $.ajax({
                url: url,
                method: "POST",
                contentType: "application/json",
                headers: { "X-CSRF-Token": this.tokenRefresh() },
                data: JSON.stringify({ definitionId, context: initialContext }),
                success: function (result) {
                  let workflowModel = this.getView().getModel("workflowModel");
                  workflowModel.setData({ apiResponse: result });
                  resolve(true);
                }.bind(this),
                error: function (error) {
                  reject(error);
                }
              });
            });
          },

          createWFModel: function () {
            this.getView().setModel(new JSONModel({
              initialContext: JSON.stringify({ someProperty: "some value" }, null, 4),
              apiResponse: "",
            }), "workflowModel");
          },

          updateWorkflowHeader: function (reqID, workflowInstanceId) {
            return new Promise((resolve, reject) => {
              //   let payload = this.PayloadData(); 
              let payload = {};
              payload.workflowInstanceId = workflowInstanceId;

              let model = this.getView().getModel("mainServiceModel");

              model.update(`/ETY_WORKFLOW_HEADERSet('${reqID}')`, payload, {
                success: function () {
                  resolve();
                },
                error: function (error) {
                  reject(error);
                }
              });
            });
          },

          getBaseURL: function () {
            let appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            let appPath = appId.replaceAll(".", "/");
            return jQuery.sap.getModulePath(appPath) + "/bpmworkflowruntime/v1";
          },

          tokenRefresh: function () {
            let token;
            let url = this.getBaseURL() + "/xsrf-token";

            $.ajax({
              url: url,
              method: "GET",
              async: false,
              headers: { "X-CSRF-Token": "Fetch" },
              success: function (_, __, xhr) {
                token = xhr.getResponseHeader("X-CSRF-Token");
              },
              error: function () {
                console.error("Failed to fetch CSRF token.");
              }
            });
            return token;
          },
          showSuccessMessage: function (reqID) {
            var that = this;
            MessageBox.success("Workflow initiated successfully for Request ID: " + reqID, {
              onClose: function () {
                var oView = that.getView();
                var oFeedInput = oView.byId("fIC");
                if (oFeedInput) {
                  oFeedInput.setValue("");
                }
                var oCommentList = oView.byId("flist");
                if (oCommentList) {
                  var oCommentModel = oCommentList.getModel("commentModel");
                  if (oCommentModel) {
                    oCommentModel.setData([]);
                    oCommentModel.updateBindings(true);
                  }
                }
                var oPVTable = oView.byId("_IDProfitCenterTable");
                if (oPVTable) {
                  var oPVModel = oPVTable.getModel("pcModel");
                  if (oPVModel) {
                    oPVModel.setData({ LineItems: [] });
                    oPVModel.updateBindings(true);
                  }
                }
                var oRouter = that.getOwnerComponent().getRouter();
                oRouter.navTo("RouteOverView");
              }
            });
          },

          getComments: function () {
            let comments = this.getView().getModel("commentModel").getData();
            if (comments.length <= 0) {
              return MessageToast.show("Comments are mandatory!");
            }

            const currentUser = this.getOwnerComponent().currentUser || "defaultUser";
            let finalComments = [];

            comments.forEach(comment => {
              finalComments.push({
                "Comment": comment.Text,
                "Username": this.getOwnerComponent()?.getModel("userModel")?.getProperty("/currentUser") || "test@user.com"
              });
            });

            return finalComments;
          },

          onCommentPost: function (oEvent) {
            var oFormat = DateFormat.getDateTimeInstance({ style: "medium" });
            var oComments = this.getView().getModel("commentModel");
            var oDate = new Date();
            var sDate = oFormat.format(oDate);

            var sValue = oEvent.getParameter("value");
            var aComments = oComments.getData();
            var oEntry = {
              UserName: this.getOwnerComponent().currentUser,
              Date: "" + sDate,
              Text: sValue,
            };
            aComments.unshift(oEntry);
            oComments.setData(aComments);
          },

          PayloadData: function () {
            let pcModel = this.getView().getModel("mainServiceModel");
            let Comments = this.getComments();
            let Type = pcModel.getProperty("/Type");
            let CreatedBy = this.getOwnerComponent()?.getModel("userModel")?.getProperty("/currentUser") || "defaultUser";
            const oComponent = this.getOwnerComponent();
            var PcCollection = this.getView().getModel("pcModel").getData().LineItems;
            const oData = {
              Status: "In Progress",
              WorkflowStatus: "In Approval",
              Type: "Create",
              CreatedBy: CreatedBy,
              NAV_WORKFLOW_ITEMSET: [],
              NAV_WORKFLOW_COMMENTS: Comments
            };

            for (var i = 0; i < PcCollection.length; i++) {
              const arrObj = {
                profitcenter: PcCollection[i].profitcenter,
                controllingarea: PcCollection[i].controllingarea,
                name: PcCollection[i].name,
                analysisPeriodValidFrom: PcCollection[i].analysisPeriodValidFrom,
                analysisPeriodValidTo: PcCollection[i].analysisPeriodValidTo,
                longText: PcCollection[i].longText,
                personresponsible: PcCollection[i].personresponsible,
                profitCentGroup: PcCollection[i].profitCentGroup,
                segment: PcCollection[i].segment,
                // companycode: PcCollection[i].companycode,
                lockIndicator: PcCollection[i].lockindicator,
                NAV_WORKFLOW_COMPANYCODE: []
              };


              oData.NAV_WORKFLOW_ITEMSET.push(arrObj);
              for (var j = 0; j < PcCollection[i].companyCode.length; j++) {
                const arr = {
                  companycode: PcCollection[i].companyCode[j].CompanyCode,
                  companyname: PcCollection[i].companyCode[j].CompanyCodeName,
                  assigned: PcCollection[i].companyCode[j].Assigned
                }
                oData.NAV_WORKFLOW_ITEMSET[i].NAV_WORKFLOW_COMPANYCODE.push(arr);
              }
            }
            return oData;
          },

        }
    );
  }
);
