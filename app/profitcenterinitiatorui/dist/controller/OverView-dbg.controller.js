sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
function (Controller) {
    "use strict";

    return Controller.extend("mdg.profitcenter.ui.profitcenterinitiatorui.controller.OverView", {
        onInit: function () {

        },
        onMenuAction: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            var sItem = oItem.getKey();
            var oRouter = this.getOwnerComponent().getRouter();

            oRouter.navTo("CreateRoute", {
                key: sItem
            });
        },
        onMenuActionDisplay: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            var sItem = oItem.getKey();
            var oRouter = this.getOwnerComponent().getRouter();

            // Asset 
            if (sItem == "A") {
                oRouter.navTo("displayAssetRoute", {
                    key: sItem
                });
            }

        },
        REQHelp: function (oEvent) {
            var sInputValue = oEvent.getSource().getValue(),
                oView = this.getView();
            // create value help dialog
            if (!this._pValueHelpDialog2) {
                this._pValueHelpDialog2 = Fragment.load({ id: oView.getId(), name: "assetmasterinitiatorui.fragments.ZREQNO", controller: this }).then(function (oValueHelpDialog) {
                    oView.addDependent(oValueHelpDialog);
                    var oModel = oView.getModel();
                    oValueHelpDialog.setModel(oModel);
                    return oValueHelpDialog;
                });
            }
            this._pValueHelpDialog2.then(function (oValueHelpDialog) { // create a filter for the binding
                oValueHelpDialog.getBinding("items").filter([new Filter("ReqId", FilterOperator.Contains, sInputValue)]);
                // open value help dialog filtered by the input value
                oValueHelpDialog.open();
            });
        },
        _handleREQNOHelpSearch: function (evt) {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter("ReqId", FilterOperator.Contains, sValue);
            evt.getSource().getBinding("items").filter([oFilter]);
        },
        //Handle req no filter dialog confirm
        _handleREQNOHelpClose: function (evt) {
            var aSelectedItems = evt.getParameter("selectedItems"),
                oMultiInput = this.byId("REQ");

            if (aSelectedItems && aSelectedItems.length > 0) {
                aSelectedItems.forEach(function (oItem) {
                    oMultiInput.addToken(new Token({ text: oItem.getTitle() }));
                });
            }
        },
        onClear: function (oEvent) {
            var oView = this.getView();
            oView.byId("REQ").destroyTokens();
            oView.byId("REQ").setValue("");
            oView.byId("rStat").setSelectedKey("");
            oView.byId("rObject").setSelectedKey("");
            oView.byId("objType").setSelectedKey("");
            oView.byId("crDate").setValue("");
        },
        onGo: function (oEvent) {
            // var globalModel = this.getOwnerComponent().getModel();
            // this.getView().setModel(globalModel);
            // var maxL = this.getView().byId("maxL").getValue();
            // if (maxL == 0) {
            // let maxL = 500;
            // this.getView().byId("maxL").setValue(maxL);
            // }
            // globalModel.setSizeLimit(maxL);

            // Table instance
            var oTable = this.getView().byId("table");
            // Refresh Bindings
            var oBindings = oTable.getBinding("items");
            // oBindings.aApplicationFilters = [];
            // oBindings.sFilterParams = undefined;
            // oBindings.refresh();

            // Global filter array
            var oFilters = [];
            var sValue = null;


            // Get Request Number filteres
            var oREQ = this.getView().byId("REQ");
            var tokensREQ = oREQ.getTokens();

            for (var i = 0; i < tokensREQ.length; i++) {
                sValue = tokensREQ[i].getText();
                if (sValue != null) {
                    var oFilterREQ = new Filter("ReqId", FilterOperator.Contains, sValue);

                    oFilters.push(oFilterREQ);
                }
                sValue = null;
            }

            // Get Filter for Request Status
            var oReqStat = this.getView().byId("rStat");
            sValue = oReqStat.getSelectedKey();
            if (sValue != "") {
                var oFilterReqStat = new Filter("Status", FilterOperator.Contains, sValue);

                oFilters.push(oFilterReqStat);
            }
            sValue = null;

            // Get Filter for Object
            // var oObject = this.getView().byId("rObject");
            // sValue = oObject.getSelectedKey();
            // if (sValue != null) {
            //     let oFilterObject = new Filter("Object", FilterOperator.Contains, sValue);

            //     oFilters.push(oFilterObject);
            // }
            // sValue = null;

            // Get Filter for Type
            var oType = this.getView().byId("objType");
            sValue = oType.getSelectedKey();
            if (sValue != "") {
                let oFilterType = new Filter("Type", FilterOperator.Contains, sValue);

                oFilters.push(oFilterType);
            }
            sValue = null;

            // Get Filter for Creation 
            var oCRDate = this.getView().byId("crDate");
            sValue = oCRDate.getDateValue();

            if (sValue != null) {

                let oStartOfDay = new Date(sValue.getFullYear(), sValue.getMonth(), sValue.getDate()),
                    oEndOfDay = new Date(sValue.getFullYear(), sValue.getMonth(), sValue.getDate() + 1);

                // var day = this.dateConvertor(sValue);

                let oFilteroCRDate = new Filter({
                    path: "CreatedOn",
                    operator: FilterOperator.BT, // Use "Between" operator
                    value1: oStartOfDay,
                    value2: oEndOfDay
                });
                // var oFilteroCRDate = new Filter("CreatedOn", FilterOperator.EQ, sValue);

                oFilters.push(oFilteroCRDate);
            }
            sValue = null;
            if (oFilters.length > 0) {
                oBindings.filter(oFilters, FilterType.Application);
            }
        },
        overviewTableSelectionChange: function (oEvtControl) {
            if (oEvtControl.getParameter('selected'))
                this.getView().byId('_IDOverviewViewButton').setEnabled(true);
            this.oSelectedItemPath = oEvtControl.getSource().getSelectedContextPaths()[0].split("'")[1];
        },
        onPressViewData: function () {
            this.getOwnerComponent().getRouter().navTo("ViewRoute", { ReqId: this.oSelectedItemPath });
        }
    });
});
