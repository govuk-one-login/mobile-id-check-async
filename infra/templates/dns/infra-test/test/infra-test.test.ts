import {Template, Capture, Match, Matcher} from "aws-cdk-lib/assertions";
import {testHelper} from "../lib/test-helper";
import {expect} from 'chai';

const helper = new testHelper();

it("Should contain only one Public Hosted zone definition in the template", () => {
    helper.getTemplate().resourceCountIs("AWS::Route53::HostedZone", 1);
})

it('Should create primary zone id in the AWS SSM parameter store', function () {
    parameterStoreConfiguration()
});
it("The public hosted zone should contain the specific custom domain.", () => {
    customDomainConfiguration()
})

const parameterStoreConfiguration = () => {
    hasExpectedKeyValuePair({
        Name: Match.objectLike({"Fn::Sub": "/${Environment}/Platform/Route53/PrimaryZoneID"}),
        Value: Match.objectLike({
            "Ref": "PublicHostedZone"            
        })
    });
}
const hasExpectedKeyValuePair = (
    properties: {
        Name: Match;
        Value: Match;
    }
) => {
    helper.getTemplate().hasResourceProperties("AWS::SSM::Parameter", {
        ...properties,
    });
};

const customDomainConfiguration = () => {
    const attributesCapture = new Capture()
    helper.getTemplate().hasResourceProperties("AWS::Route53::HostedZone", {
        Name: attributesCapture,
    })
    const expectedConfiguration = "review-b-async.account.gov.uk"
    const attributes = attributesCapture.asObject()['Fn::If']
    const domainAttribute = attributes[1]
    expect(domainAttribute).to.be.an('string').to.deep.include(expectedConfiguration)
}