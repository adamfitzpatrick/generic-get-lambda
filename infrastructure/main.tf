data "template_file" "lambda_execution_assume_role_policy" {
    template = "${file("${path.module}/policies/lambda-execution-assume-role.template.json")}"
}

data "template_file" "lambda_dynamo_policy" {
    template = "${file("${path.module}/policies/lambda-dynamo.template.json")}"

    vars = {
        dynamo_table_arn = "${var.dynamo_table_arn}"
    }
}

resource "aws_iam_role" "get-lambda_execution_role" {
    name = "${var.function_name}-execution-role"

    assume_role_policy = "${data.template_file.lambda_execution_assume_role_policy.rendered}"
}

resource "aws_iam_role_policy" "get-lambda_permissions_policy" {
    name   = "${var.function_name}-dynamo-policy"
    role   = "${aws_iam_role.get-lambda_execution_role.id}"
    policy = "${data.template_file.lambda_dynamo_policy.rendered}"
}

resource "aws_lambda_function" "get-lambda_function" {
    filename         = "${path.module}/get-lambda.zip"
    function_name    = "${var.function_name}"
    handler          = "index.handler"
    source_code_hash = "${filebase64sha256("${path.module}/get-lambda.zip")}"
    runtime          = "nodejs8.10"
    role             = "${aws_iam_role.get-lambda_execution_role.arn}"

    environment {
        variables = {
            TABLE_NAME  = "${var.table_name}"
            PRIMARY_KEY = "${var.primary_key}"
            SORT_KEY    = "${var.sort_key}"
        }
    }
}