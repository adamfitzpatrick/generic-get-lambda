

variable "function_name" {
    description = "Name of lambda function as deployed to AWS"
    default     = "get-lambda"
}

variable "dynamo_table_arn" {
    description = "ARN used for restricting lambda access to a specific dynamo table"
    default     = "*"
}

variable "table_name" {
    description = "DynamoDB table from which the lambda obtains data"
}

variable "primary_key" {
    description = "Primary key name for the DynamoDB source table"
}

variable "sort_key" {
    description = "Sort key name for the DynamoDB source table"
    default     = ""
}