sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "com/deloitte/mdg/profitcenter/approver1/pcapprover/model/models"
], (UIComponent,JSONModel, models) => {
    "use strict";
    var that;
    return UIComponent.extend("com.deloitte.mdg.profitcenter.approver1.pcapprover.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init:async function() {
            that=this;
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

             var oPVModel = new JSONModel({
                    LineItems: [],
                    SelectedItem: {}
                });

                this.setModel(oPVModel, "pcModel");
                var oComments = new JSONModel();
        oComments.setData([]);
        this.setModel(oComments, "commentModel");
        let userId = "DEFAULT_USER";

                if (sap.ushell?.Container?.getUser) {
                    userId = sap.ushell.Container.getUser().getEmail();
                }

                let userModel = new JSONModel({
                    currentUser: userId
                });

                this.setModel(userModel, "userModel");


            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        },
        createContent: function () {
                var oContent = sap.ui.view({
                    id: "taskViewProfitCenter",
                    viewName: "com.deloitte.mdg.profitcenter.approver1.pcapprover.view.Approver",
                    type: sap.ui.core.mvc.ViewType.XML
                });

                // Wait until My Inbox injects inboxAPI
                var startupParams = this.getComponentData().startupParameters;

                if (startupParams && startupParams.inboxAPI) {
                    var inboxAPI = startupParams.inboxAPI;

                    // Show footer with action buttons
                    inboxAPI.setShowFooter(true);

                    // ADD APPROVE BUTTON
                    inboxAPI.addAction({
                        action: "approve",
                        label: "Approve",
                        type: "POSITIVE"
                    }, function () {
                        return oContent.getController().onApprove();
                    });

                    // ADD REJECT BUTTON
                    inboxAPI.addAction({
                        action: "reject",
                        label: "Reject",
                        type: "NEGATIVE"
                    }, function () {
                        return oContent.getController().onReject();
                    },
                this
            );
                }

                return oContent;
            }
    });
});