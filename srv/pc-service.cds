using {MDGProfitCenter.db as profit} from '../db/data-model';
using {ZDEMP_BTP_SRV as external} from './external/ZDEMP_BTP_SRV';

@path: 'pcservice'
service ProfitCenterService @(requires: 'authenticated-user') {
    entity ETY_WORKFLOW_HEADERSet as projection on profit.ETY_WORKFLOW_HEADER;
    entity ETY_WORKFLOW_ITEMSet   as projection on profit.ETY_WORKFLOW_ITEM;

    //external service for VH
    entity CompanyCodeVH          as
        select from external.I_CompanyCode {
            CompanyCode,
            CompanyCodeName
        }
}
