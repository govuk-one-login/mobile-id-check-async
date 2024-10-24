#! /usr/bin/env bash

# Used to retrieve the IP addresses of the network interfaces created for the exeute-api VPC Endpoint in the dev platform vpc
# Requires the use of an aws profile for each environment, the profile name is of the form "async-${env}"

envs=${1:-"dev build staging integration production"}

results="$(printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "Environment" "Network InterfaceId" "Availability Zone" "IP Address" "Subnet Id" "Subnet Name" "VpcId" "VpcName")"
results="$(printf "%s\n%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "${results}" "-----------" "-------------------" "-----------------" "----------" "---------" "-----------" "-----" "-------")"

for env in $envs; do

  export AWS_PROFILE="async-${env}"

  echo "Environment: ${env}"

  aws ec2 describe-vpcs >"vpcs.${env}.json"
  aws ec2 describe-vpc-endpoints >"vpc-endpoints.${env}.json"
  aws ec2 describe-network-interfaces >"network-interfaces.${env}.json"
  aws ec2 describe-subnets >"subnets.${env}.json"

  vpcName="devplatform-vpc-Vpc"
  vpcId="$(jq --raw-output --arg vpcName "${vpcName}" '.Vpcs[] | select( ( .Tags[] | select(.Key == "Name") | .Value ) == $vpcName) | .VpcId ' vpcs.${env}.json)"
  executeApiNetworkInterfaceIds=$(jq --raw-output '.VpcEndpoints[] | select(.ServiceName == "com.amazonaws.eu-west-2.execute-api" ) | .NetworkInterfaceIds[]' "vpc-endpoints.${env}.json")

  for executeApiNetworkInterfaceId in $executeApiNetworkInterfaceIds; do
    echo "Network Interface Id: ${executeApiNetworkInterfaceId}"

    az=$(jq --raw-output --arg netwrokInterfaceId "${executeApiNetworkInterfaceId}" '.NetworkInterfaces[] | select(.NetworkInterfaceId == $netwrokInterfaceId) | .AvailabilityZone' "network-interfaces.${env}.json")
    ip=$(jq --raw-output --arg netwrokInterfaceId "${executeApiNetworkInterfaceId}" '.NetworkInterfaces[] | select(.NetworkInterfaceId == $netwrokInterfaceId) | .PrivateIpAddress' "network-interfaces.${env}.json")
    sn=$(jq --raw-output --arg netwrokInterfaceId "${executeApiNetworkInterfaceId}" '.NetworkInterfaces[] | select(.NetworkInterfaceId == $netwrokInterfaceId) | .SubnetId' "network-interfaces.${env}.json")

    snName=$(jq --raw-output --arg sn "${sn}" '.Subnets[] | select(.SubnetId == $sn) | .Tags[] | select(.Key == "Name") | .Value' "subnets.${env}.json")

    results="${results}\n$(printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "${env}" "${executeApiNetworkInterfaceId}" "${az}" "${ip}" "${sn}" "${snName}" "${vpcId}" "${vpcName}")"
  done

  echo

done

echo "${results}" | column -t -s $'\t'
