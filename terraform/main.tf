data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "classconnect_sg" {
  name        = "${var.project_name}-sg"
  description = "ClassConnect web access"
  vpc_id      = data.aws_vpc.default.id


  ingress {
    description = "HTTP frontend"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}

resource "aws_instance" "classconnect" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.classconnect_sg.id]

  iam_instance_profile        = aws_iam_instance_profile.classconnect_profile.name
  associate_public_ip_address = true

  user_data = <<-EOF
  #!/bin/bash
  dnf update -y
  dnf install -y docker amazon-ssm-agent
  systemctl enable docker
  systemctl start docker
  systemctl enable amazon-ssm-agent
  systemctl start amazon-ssm-agent
EOF

  tags = {
    Name = "${var.project_name}-server"
  }
}
resource "aws_iam_role" "classconnect_ssm_role" {
  name = "classconnect-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.classconnect_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "classconnect_profile" {
  name = "classconnect-instance-profile"
  role = aws_iam_role.classconnect_ssm_role.name
}
