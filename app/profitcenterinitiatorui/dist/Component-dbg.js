/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "mdg/profitcenter/ui/profitcenterinitiatorui/model/models",
         "sap/ui/model/json/JSONModel"
    ],
    function (UIComponent, Device, models,JSONModel) {
        "use strict";

        return UIComponent.extend("mdg.profitcenter.ui.profitcenterinitiatorui.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                let userId = "DEFAULT_USER";

                if (sap.ushell?.Container?.getUser) {
                    userId = sap.ushell.Container.getUser().getEmail();
                }

                let userModel = new JSONModel({
                    currentUser: userId
                });

                this.setModel(userModel, "userModel");

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
            }
        });
    }
);