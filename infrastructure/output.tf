output "invoke-arn" {
    value = "${aws_lambda_function.get-lambda_function.invoke_arn}"
}