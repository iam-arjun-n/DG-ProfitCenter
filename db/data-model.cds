namespace MDGProfitCenter.db;

using {
    cuid,
    managed
} from '@sap/cds/common';

@assert.range
type Status       : String enum {
    Draft;
    Submitted;
    ![Material Master Created];
    Cancelled;
    Error;
    Rejected;
    Rework;
    ![In Progress];
}
@assert.range
type WorkflowStatus      : String enum {
    ![Not Started];
    ![In Approval];
    Rejected;
    ![Not Applicable];
    Completed;
    ![In Progress];
}
type Type : String enum {
    Create;
    Change;
    Extend;
}


@cds.persistence.entity
entity ETY_WORKFLOW_HEADER:cuid {
    key ReqId                : String(20)
        @UI.HiddenFilter: false;
        ID                   : Integer;
        Status               : Status;
        workflowInstanceId   : String(50);
        WorkflowStatus       : WorkflowStatus;
        CreatedBy            : String(242);
        CreatedOn            : Timestamp
        @cds.on.insert  : $now;
        Object               : String(10);
        Type                 : Type;
        TabCombination       : String(3);
        PendingWith          : String(12);
        LastModifiedOn       : Timestamp
        @cds.on.insert  : $now
        @cds.on.update  : $now;
        LastModifiedBy       : String(242);
        NAV_WORKFLOW_ITEMSET : Composition of many ETY_WORKFLOW_ITEM
                                   on NAV_WORKFLOW_ITEMSET.NAV_WORKFLOW_HEADER = $self;
        NAV_WORKFLOW_COMMENTS: Composition of many ETY_WORKFLOW_COMMENTS
                                on NAV_WORKFLOW_COMMENTS.NAV_WORKFLOW_HEADER=$self;
}

@cds.persistence.entity
entity ETY_WORKFLOW_COMMENTS:cuid{
    key NAV_WORKFLOW_HEADER: Association to ETY_WORKFLOW_HEADER;
        Username: String(100) default CURRENT_USER;
        Date: Timestamp default CURRENT_TIMESTAMP;
        Comment: String(1000);
}

@cds.persistence.entity
entity ETY_WORKFLOW_ITEM : cuid, managed {
    key NAV_WORKFLOW_HEADER     : Association to ETY_WORKFLOW_HEADER;
        profitcenter            : String(10) @title: 'Profit Center';
        controllingarea         : String(4)  @title: 'Controlling Area';
        //Basic Data - description
        name                    : String(20) @title: 'Name';
        // status                  : String    @title: 'Status';
        analysisPeriodValidFrom : String       @title: 'Analysis Period Valid From';
        analysisPeriodValidTo   : String       @title: 'Analysis Period Valid To';
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
