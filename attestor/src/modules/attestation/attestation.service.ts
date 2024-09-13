import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CloudStorageService } from "../cloud-storage/cloud-storage.service";
import { EASService } from "../eas/eas.service";
import { AttestData } from "../eas/dto/dto";
import * as fs from 'fs';

@Injectable()
export class AttestationService {
  
  private bucketName: string
  private top100DelegatesSchemaId: string
  constructor(
    private readonly configService: ConfigService,
    private readonly cloudStorageService: CloudStorageService,
    private readonly easService: EASService,
  ) {
    this.bucketName = this.configService.get<string>('attestation.bucketName')
    this.top100DelegatesSchemaId = this.configService.get<string>('attestation.top100DelegatesSchema')
  }

  async attestTop100Delegates(): Promise<void> {
    // read checkpoint from storage
    const checkpoint = await this.cloudStorageService.downloadAsString(this.bucketName, 'mvp/checkpoint.txt')
    // if found result txt, don't attest
    const basePath = `mvp/${checkpoint}`
    const resultExist = await this.cloudStorageService.checkFileExist(this.bucketName, `${basePath}/result.json`)
    if (resultExist) {
      throw new Error('Already attested')
    }
    // read all current attestation
    const attestationText = await this.cloudStorageService.downloadAsString(this.bucketName, `mvp/attestation_list.json`)
    const attestationList = JSON.parse(attestationText)
    // without partial vp
    let attestationWithoutPartialVP: Record<string, string> = attestationList.delegates_without_partial_vp
    const withoutPartialVPOperationListText = await this.cloudStorageService.downloadAsString(this.bucketName, `${basePath}/attestation_without_partial_vp.json`)
    const withoutPartialVPOperationList = JSON.parse(withoutPartialVPOperationListText)
    const withoutPartialVPAttestResults = await this._attestTop100Delegates(checkpoint, attestationWithoutPartialVP, false, withoutPartialVPOperationList)
    // with partial vp
    let attestationWithPartialVP: Record<string, string> = attestationList.delegates_with_partial_vp
    const withPartialVPOperationListText = await this.cloudStorageService.downloadAsString(this.bucketName, `${basePath}/attestation_with_partial_vp.json`)
    const withPartialVPOperationList = JSON.parse(withPartialVPOperationListText)
    const withPartialVPAttestResults = await this._attestTop100Delegates(checkpoint, attestationWithPartialVP, true, withPartialVPOperationList)
    // merge all results
    const finalAttestationList = {
      delegates_with_partial_vp: withPartialVPAttestResults.attestationList,
      delegates_without_partial_vp: withoutPartialVPAttestResults.attestationList
    }
    await this.cloudStorageService.upload(this.bucketName, `mvp/attestation_list.json`, Buffer.from(JSON.stringify(finalAttestationList, null, 2)), true)
    const finalResults = {
      withoutPartialVP: {
        revoke: withoutPartialVPAttestResults.revokeResults,
        issue: withoutPartialVPAttestResults.attestResults
      },
      withPartialVP: {
        revoke: withPartialVPAttestResults.revokeResults,
        issue: withPartialVPAttestResults.attestResults
      }
    }
    await this.cloudStorageService.upload(this.bucketName, `${basePath}/result.json`, Buffer.from(JSON.stringify(finalResults, null, 2)), true) 
  }

  constructTop100DelegatesAttestData(includePartialDelegation: boolean, date: string): AttestData[] {
    return [
      {
        name: 'rank',
        value: 'top100',
        type: 'string',
      }, 
      {
        name: 'includePartialDelegatation',
        value: includePartialDelegation.toString(),
        type: 'bool',
      },
      {
        name: 'date',
        value: date,
        type: 'string',
      }
    ]
  }

  private async _attestTop100Delegates(
    checkpoint: string,
    attestationList: Record<string, string>,
    includePartialDelegation: boolean,
    operationList: Record<string, string[]>
  ) {
    const attestationResults = {}
    const {issue: issueList, revoke: revokeList} = operationList
    // revoke old attestations
    const revokeEasIds: string[] = revokeList.map(revoke => attestationList[revoke])
    let revokeResults = []
    if (revokeEasIds.length > 0) {
      let tempRevokeEasIds = revokeEasIds
      while(tempRevokeEasIds.length > 0) {
        const tempList = tempRevokeEasIds.splice(0, 10)
        const revokeResult = await this.easService.multipleRevoke(this.top100DelegatesSchemaId, tempList)
        revokeResults.push(revokeResult)
      }
    }
    revokeList.map(revoke => {
      if (attestationList[revoke]) {
        delete attestationList[revoke]
      }
    })
    // attest new delegates
    const attestRequestDatas = []
    issueList.map(issue => {
      attestRequestDatas.push({
        recipient: issue,
        datas: this.constructTop100DelegatesAttestData(includePartialDelegation, checkpoint)
      })
    })
    let attestResults = []
    if (attestRequestDatas.length > 0) {
      let tempAttestLists = attestRequestDatas
      while(tempAttestLists.length > 0) {
        const tempList = tempAttestLists.splice(0, 10)
        const attestResult = await this.easService.multipleAttest(this.top100DelegatesSchemaId, tempList)
        attestResults.push(attestResult[0].txhash)
        attestResult.map((result, index) => {
          attestationList[tempList[index]['recipient']] = result.easId
        })
      }
    }
    return {
      revokeResults,
      attestResults,
      attestationList
    }
  }
}