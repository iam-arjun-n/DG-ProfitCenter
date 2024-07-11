namespace MDGProfitCenter.db;

using {
    cuid,
    managed
} from '@sap/cds/common';

entity ETY_WORKFLOW_HEADER : managed {
    key ReqId                : String(20) @title: 'Request ID';
        ID                   : Integer    @title: 'ID';
        Status               : String(10) @title: 'Request Status';
        Object               : String(10);
        Type                 : String(10) @title: 'Request Type';
        TabCombination       : String(3);
        NAV_WORKFLOW_ITEMSET : Composition of many ETY_WORKFLOW_ITEM
                                   on NAV_WORKFLOW_ITEMSET.NAV_WORKFLOW_HEADER = $self;
}

entity ETY_WORKFLOW_ITEM : cuid, managed {
    key NAV_WORKFLOW_HEADER     : Association to ETY_WORKFLOW_HEADER;
        profitcenter            : String(10) @title: 'Profit Center';
        controllingarea         : String(4)  @title: 'Controlling Area';
        //Basic Data - description
        name                    : String(20) @title: 'Name';
        // status                  : String    @title: 'Status';
        analysisPeriodValidFrom : Date       @title: 'Analysis Period Valid From';
        analysisPeriodValidTo   : Date       @title: 'Analysis Period Valid To';
        longText                : String(40) @title: 'Long Text';
        personresponsible       : String(20) @title: 'Person Responsible';
        profitCentGroup         : String(12) @title: 'Profit Cent Group';
        segment                 : String(10) @title: 'Segment';
        //company codes
        companycode             : String(4)  @title: 'Company Code';
        companyname             : String(25) @title: 'Company Name';
        assigned                : Boolean    @title: 'Assigned';
        //indicators
        lockIndicator           : Boolean    @title: 'Lock Indicator';

}
