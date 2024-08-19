import {Template, Capture, Match} from "aws-cdk-lib/assertions";
import {testHelper} from "../lib/test-helper";
import {expect} from 'chai';

const helper = new testHelper();

it("Should contain only one certificate manager resource definition in the template", () => {
    helper.getTemplate().resourceCountIs("AWS::CertificateManager::Certificate", 1);
})

it('The certificate manager for Domain Validation Options should be set to the public hosted zone Id', function () {
    customDomainConfiguration()
});

it('The certificate manager for Domain Validation Options should have the valid tag', function () {
    tagConfiguration()
});

describe("Certificate manager", () => {
    test.each`
    ENVIRONMENT      | DNSSUFFIX
    ${"dev"}         | ${"review-b-async.dev.account.gov.uk"}
    ${"build"}       | ${"review-b-async.build.account.gov.uk"}
    ${"staging"}     | ${"review-b-async.staging.account.gov.uk"}
    ${"integration"} | ${"review-b-async.integration.account.gov.uk"}
    ${"production"}  | ${"review-b-async.account.gov.uk"}
  `(
        `Uri for $ENVIRONMENT has correct value`,
        ({ENVIRONMENT, DNSSUFFIX}) => {
            const mappings = helper
                .getTemplate()
                .findMappings("PlatformConfiguration");
            expect(mappings.PlatformConfiguration[ENVIRONMENT].DNSSUFFIX).to.equal(DNSSUFFIX)
        }
    );
})

const customDomainConfiguration = () => {
    const attributesCapture = new Capture()
    helper.getTemplate().hasResourceProperties("AWS::CertificateManager::Certificate", {
        DomainValidationOptions: attributesCapture,
    })
    const expectedConfiguration = {"Fn::ImportValue": "PublicHostedZoneId"}
    const attributes = attributesCapture.asArray()
    const domainAttribute = attributes[2].HostedZoneId
    expect(domainAttribute).to.be.an('object').to.deep.include(expectedConfiguration)
}

const tagConfiguration = () => {
    const attributesCapture = new Capture()
    helper.getTemplate().hasResourceProperties("AWS::CertificateManager::Certificate", {
        Tags: attributesCapture,
    })
    const expectedConfiguration =  {"Fn::FindInMap": ["PlatformConfiguration", {"Ref": "Environment"}, "DNSSUFFIX"]}
    const attributes = attributesCapture.asArray()
    const domainAttribute = attributes[0].Value["Fn::Sub"][1]["DNSSUFFIX"]
    expect(domainAttribute).to.be.an('object').to.deep.include(expectedConfiguration)
}
