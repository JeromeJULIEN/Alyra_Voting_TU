# Alyra / Promo Dev Rinkeby / Projet 2 : TU voting.sol
Repository of a unitary test project based on a voting Smart Contract

## Test organization
The testing file is organized as bellow :
### Modifier test
Testing of ```onlyOwner``` et ```onlyvoters```
### Functions test
Test of all the fonctions of the contract : ```getVoter(),getOneProposal(),addVoter(),addProposal(),setVote()```
### State modifiers test
Test of all the state modifiers of the contract, modifying ```workflowStatus```

The test of ```tallyVote()```is divided in two sections :
- The status modification test
- The winning proposal identification

## Result
Bellow the sumarize of eth-gas-reporter :

![resulat eth-gas-reporter](./Capture%20d%E2%80%99%C3%A9cran%202022-10-27%20%C3%A0%2017.53.40.png)