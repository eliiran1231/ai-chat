import { OperationsNegotiator } from "../interfaces/OperationsNegotiator"
export const defaultNegotiator: OperationsNegotiator = {
    negotiateBatchEdit: ()=>true,
    negotiateBatchDelete: ()=>true
}