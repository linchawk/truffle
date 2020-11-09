import {logger} from "@truffle/db/logger";
const debug = logger("db:loaders:schema:artifactsLoader");

import { Db, IdObject, toIdObject } from "@truffle/db/meta";
import Config from "@truffle/config";
import TruffleResolver from "@truffle/resolver";
import type { Resolver } from "@truffle/resolver";
import { Environment } from "@truffle/environment";
import { ContractObject } from "@truffle/contract-schema/spec";

import { Project } from "@truffle/db/loaders/project";
import { FindContracts } from "@truffle/db/loaders/resources/contracts";
import { WorkflowCompileResult } from "@truffle/compile-common/src/types";
import WorkflowCompile from "@truffle/workflow-compile";

export class ArtifactsLoader {
  private db: Db;
  private compilationConfig: Partial<Config>;
  private resolver: Resolver;

  constructor(db: Db, config?: Partial<Config>) {
    this.db = db;
    this.compilationConfig = config;
    // @ts-ignore
    this.resolver = new TruffleResolver(config);
  }

  async load(): Promise<void> {
    debug("Compiling...");
    const result: WorkflowCompileResult = await WorkflowCompile.compile(
      this.compilationConfig
    );
    debug("Compiled.");

    debug("Initializing project...");
    const project = await Project.initialize({
      project: {
        directory: this.compilationConfig.working_directory
      },
      db: this.db
    });
    debug("Initialized project.");

<<<<<<< HEAD
    debug("Loading compilations...");
    const { contracts } = await project.loadCompile({ result });
    debug("Loaded compilations.");

    debug("Assigning contract names...");
    await project.assignNames({ assignments: { contracts } });
    debug("Assigned contract names.");
=======
    //map contracts and contract instances to compiler
    await Promise.all(
      compilations.map(async ({id}, index) => {
        const {
          data: {
            compilation: {processedSources}
          }
        } = await this.db.query(GetCompilation, {id});

        const networks = await this.loadNetworks(
          project.id,
          result.compilations[index].contracts,
          this.config["artifacts_directory"],
          this.config["contracts_directory"]
        );

        const processedSourceContracts = processedSources
          .map(processedSource => processedSource.contracts)
          .flat();

        let contracts = [];
        result.compilations[index].contracts.map(({contractName}) =>
          contracts.push(
            processedSourceContracts.find(({name}) => name === contractName)
          )
        );
>>>>>>> Update IContract -> Contract type in artifactsLoader

    const artifacts = await this.collectArtifacts(contracts);

    const config = Config.detect({
      working_directory: this.compilationConfig["contracts_directory"]
    });
<<<<<<< HEAD

    debug("Loading networks...");
    const networks = [];
    for (const name of Object.keys(config.networks)) {
      try {
        debug("Connecting to network name: %s", name);
        config.network = name;
        await Environment.detect(config);

        const result = await project
          .connect({ provider: config.provider })
          .loadMigrate({
            network: { name },
            artifacts
          });

        networks.push(result.network);
      } catch (error) {
        debug("error %o", error);
        continue;
      }
    }
    debug("Loaded networks.");
=======
    let {
      data: {nameRecordsAdd}
    } = nameRecordsResult;

    const projectNames = nameRecordsAdd.nameRecords.map(
      ({id: nameRecordId, name, type}) => ({
        project: {id: projectId},
        nameRecord: {id: nameRecordId},
        name,
        type
      })
    );
>>>>>>> Update IContract -> Contract type in artifactsLoader

    debug("Assigning network names...");
    await project.assignNames({ assignments: { networks } });
    debug("Assigned network names.");
  }

<<<<<<< HEAD
  private async collectArtifacts(
    contractIdObjects: IdObject<DataModel.Contract>[]
  ): Promise<ContractObject[]> {
    // get full representation
    debug(
      "Retrieving contracts, ids: %o...",
      contractIdObjects.map(({ id }) => id)
    );
    const {
      data: { contracts }
    } = await this.db.execute(FindContracts, {
      ids: contractIdObjects.map(({ id }) => id)
    });
    debug(
      "Retrieved contracts, ids: %o.",
      contractIdObjects.map(({ id }) => id)
    );

    // and resolve artifact
    return contracts.map((contract: DataModel.Contract) => {
      const { name } = contract;

      debug("Requiring artifact for %s...", name);
      // @ts-ignore
      const artifact: ContractObject = this.resolver.require(name)._json;
      debug("Required artifact for %s.", name);
=======
  async resolveProjectName(projectId: string, type: string, name: string) {
    let {data} = await this.db.query(ResolveProjectName, {
      projectId,
      type,
      name
    });

    if (data.project.resolve.length > 0) {
      return {
        id: data.project.resolve[0].id
      };
    }
  }

  async loadNetworks(
    projectId: string,
    contracts: Array<CompiledContract>,
    artifacts: string,
    workingDirectory: string
  ) {
    const networksByContract = await Promise.all(
      contracts.map(async ({contractName, bytecode}) => {
        const name = contractName.toString().concat(".json");
        const artifactsNetworksPath = fse.readFileSync(
          path.join(artifacts, name)
        );
        const artifactsNetworks = JSON.parse(artifactsNetworksPath.toString())
          .networks;
        let configNetworks = [];
        if (Object.keys(artifactsNetworks).length) {
          const config = Config.detect({workingDirectory: workingDirectory});
          for (let network of Object.keys(config.networks)) {
            config.network = network;
            await Environment.detect(config);
            let networkId;
            let web3;
            try {
              web3 = new Web3(config.provider);
              networkId = await web3.eth.net.getId();
            } catch (err) {}

            if (networkId) {
              let filteredNetwork = Object.entries(artifactsNetworks).filter(
                network => network[0] == networkId
              );
              //assume length of filteredNetwork is 1 -- shouldn't have multiple networks with same id in one contract
              if (filteredNetwork.length > 0) {
                const transaction = await web3.eth.getTransaction(
                  filteredNetwork[0][1]["transactionHash"]
                );
                const historicBlock = {
                  height: transaction.blockNumber,
                  hash: transaction.blockHash
                };

                const networksAdd = await this.db.query(AddNetworks, {
                  networks: [
                    {
                      name: network,
                      networkId: networkId,
                      historicBlock: historicBlock
                    }
                  ]
                });

                const id = networksAdd.data.networksAdd.networks[0].id;
                configNetworks.push({
                  contract: contractName,
                  id: id,
                  address: filteredNetwork[0][1]["address"],
                  transactionHash: filteredNetwork[0][1]["transactionHash"],
                  bytecode: bytecode,
                  links: filteredNetwork[0][1]["links"],
                  name: network
                });
              }
            }
          }
        }

        const nameRecords = await Promise.all(
          configNetworks.map(async (network, index) => {
            //check if there is already a current head for this item. if so save it as previous
            let current: IdObject = await this.resolveProjectName(
              projectId,
              "Network",
              network.name
            );

            return {
              name: network.name,
              type: "Network",
              resource: {
                id: configNetworks[index].id
              },
              previous: current
            };
          })
        );

        await this.loadNameRecords(projectId, nameRecords);

        return configNetworks;
      })
    );
    return networksByContract;
  }

  getNetworkLinks(network: LoaderNetworkObject, bytecode: BytecodeInfo) {
    let networkLink: Array<LinkValueObject> = [];
    if (network.links) {
      networkLink = Object.entries(network.links).map(link => {
        let linkReferenceIndexByName = bytecode.linkReferences.findIndex(
          ({name}) => name === link[0]
        );

        let linkValue = {
          value: link[1],
          linkReference: {
            bytecode: {id: bytecode.id},
            index: linkReferenceIndexByName
          }
        };

        return linkValue;
      });
    }

    return networkLink;
  }

  async loadContractInstances(
    contracts: Array<DataModel.Contract>,
    networksArray: Array<Array<LoaderNetworkObject>>
  ) {
    // networksArray is an array of arrays of networks for each contract;
    // this first mapping maps to each contract
    const instances = networksArray.map((networks, index) => {
      // this second mapping maps each network in a contract
      const contractInstancesByNetwork = networks.map(network => {
        let createBytecodeLinkValues = this.getNetworkLinks(
          network,
          contracts[index].createBytecode
        );
        let callBytecodeLinkValues = this.getNetworkLinks(
          network,
          contracts[index].callBytecode
        );

        let instance = {
          address: network.address,
          contract: {
            id: contracts[index].id
          },
          network: {
            id: network.id
          },
          creation: {
            transactionHash: network.transactionHash,
            constructor: {
              createBytecode: {
                bytecode: {id: contracts[index].createBytecode.id},
                linkValues: createBytecodeLinkValues
              }
            }
          },
          callBytecode: {
            bytecode: {id: contracts[index].callBytecode.id},
            linkValues: callBytecodeLinkValues
          }
        };
        return instance;
      });
>>>>>>> Update IContract -> Contract type in artifactsLoader

      artifact.db = {
        contract: toIdObject(contract)
      };

      return artifact;
    });
  }
}
