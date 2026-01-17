sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/FilterType",
  "sap/ui/core/Fragment",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Token"
], function (
  Controller,
  Filter,
  FilterOperator,
  FilterType,
  Fragment,
  MessageBox,
  MessageToast,
  Token
) {
  "use strict";

  return Controller.extend(
    "mdg.profitcenter.ui.profitcenterinitiatorui.controller.OverView",
    {
      onInit: function () {},

      onCreatePress: function () {
        this.getOwnerComponent().getRouter().navTo("CreateRoute");
      },

      /* ================= FILTER BAR ================= */

     onClear: function () {
    // 1️⃣ Clear filter fields
    this.byId("REQ").destroyTokens();
    this.byId("rStat").setSelectedKey("");
    this.byId("objType").setSelectedKey("");
    this.byId("crDate").setValue("");

    // 2️⃣ Refresh table (IMPORTANT)
    const oTable = this.byId("idTable");   // <-- your table ID
    const oBinding = oTable.getBinding("items");

    if (oBinding) {
        oBinding.filter([]);   // removes all filters
    }
},

      onGo: function () {
        const oTable = this.byId("idTable");
        const oBinding = oTable.getBinding("items");
        const aFilters = [];

        /* ---- Request Number (MultiInput OR condition) ---- */
        const aREQFilters = [];
        this.byId("REQ").getTokens().forEach(oToken => {
          aREQFilters.push(
            new Filter("ReqId", FilterOperator.Contains, oToken.getText())
          );
        });

        if (aREQFilters.length) {
          aFilters.push(new Filter({ filters: aREQFilters, and: false }));
        }

        /* ---- Status ---- */
        const sStatus = this.byId("rStat").getSelectedKey();
        if (sStatus) {
          aFilters.push(new Filter("Status", FilterOperator.EQ, sStatus));
        }

        /* ---- Type ---- */
        const sType = this.byId("objType").getSelectedKey();
        if (sType) {
          aFilters.push(new Filter("Type", FilterOperator.EQ, sType));
        }

        /* ---- Creation Date (BT) ---- */
        const oDate = this.byId("crDate").getDateValue();
        if (oDate) {
          const oStart = new Date(oDate);
          oStart.setHours(0, 0, 0, 0);

          const oEnd = new Date(oDate);
          oEnd.setHours(23, 59, 59, 999);

          aFilters.push(
            new Filter("CreatedOn", FilterOperator.BT, oStart, oEnd)
          );
        }

        oBinding.filter(aFilters, FilterType.Application);
      },

      /* ================= TABLE ================= */

      overviewTableSelectionChange: function (oEvent) {
        const bSelected = oEvent.getParameter("selected");
        this.byId("btnview").setEnabled(bSelected);

        if (bSelected) {
          this._sReqId =
            oEvent.getSource().getSelectedContextPaths()[0].split("'")[1];
        }
      },

      onViewObj: function () {
        if (this._sReqId) {
          this.getOwnerComponent()
            .getRouter()
            .navTo("ViewRoute", { ReqId: this._sReqId });
        }
      },

      /* ================= VALUE HELP (REQ) ================= */

      REQHelp: function (oEvent) {
        const sValue = oEvent.getSource().getValue();
        const oView = this.getView();

        if (!this._pReqVH) {
          this._pReqVH = Fragment.load({
            id: oView.getId(),
            name: "assetmasterinitiatorui.fragments.ZREQNO",
            controller: this
          }).then(oDialog => {
            oView.addDependent(oDialog);
            oDialog.setModel(oView.getModel());
            return oDialog;
          });
        }

        this._pReqVH.then(oDialog => {
          oDialog
            .getBinding("items")
            .filter([new Filter("ReqId", FilterOperator.Contains, sValue)]);
          oDialog.open();
        });
      },

      _handleREQNOHelpSearch: function (oEvent) {
        const sValue = oEvent.getParameter("value");
        oEvent
          .getSource()
          .getBinding("items")
          .filter([new Filter("ReqId", FilterOperator.Contains, sValue)]);
      },

      _handleREQNOHelpClose: function (oEvent) {
        const aItems = oEvent.getParameter("selectedItems");
        const oMultiInput = this.byId("REQ");

        if (aItems) {
          aItems.forEach(oItem => {
            oMultiInput.addToken(new Token({ text: oItem.getTitle() }));
          });
        }
      }
    }
  );
});
