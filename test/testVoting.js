// on récupère un artefact du contrat
const Voting = artifacts.require("Voting"); 
// on récupère les librairie nécessaire pour les tests
const {BN,expectRevert,expectEvent} = require("@openzeppelin/test-helpers");
const {expect} = require('chai');



contract("Voting", accounts => { 
  // Initialisation des variables nécessaires aux tests
  const owner = accounts[0];
  let votingInstance;

  describe(":::: MODIFIER TESTS ::::",()=>{
    beforeEach(async()=>{
      votingInstance = await Voting.new({from:owner});
    })
    it("onlyOwner: should revert addVoter() if caller is not the owner",async()=>{
      await expectRevert( votingInstance.addVoter(accounts[1],{from:accounts[2]}),"Ownable: caller is not the owner")
    });
    it("onlyVoters: should revert addProposal() and setVote() if caller is not a voter",async()=>{
      await votingInstance.addVoter(accounts[1],{from:owner});
      await votingInstance.startProposalsRegistering({from:owner});
      await expectRevert(votingInstance.addProposal('prop',{from:accounts[3]}),"You're not a voter");
      await votingInstance.endProposalsRegistering({from:owner});
      await votingInstance.startVotingSession({from:owner});
      await expectRevert(votingInstance.setVote(new BN(0),{from:accounts[3]}),"You're not a voter");
    })
  })

  describe(":::: FUNCTIONS TESTS ::::",()=>{
    describe("getVoter() test",()=>{
      before(async()=>{
        votingInstance = await Voting.new({from:owner});
        await votingInstance.addVoter(accounts[1],{from:owner});
      })
      it("should return a Voter struct",async()=>{
        const data = await votingInstance.getVoter(accounts[1],{from:accounts[1]})
        expect(data.isRegistered).to.equal(true)
        expect(data.hasVoted).to.equal(false)
        expect(data.votedProposalId).to.be.bignumber.equal(new BN(0))
      })
    })
  
    describe("getOneProposal() test",()=>{
      before(async()=>{
        votingInstance = await Voting.new({from:owner});
        await votingInstance.addVoter(accounts[1],{from:owner});
        await votingInstance.startProposalsRegistering({from:owner});
        await votingInstance.addProposal('prop',{from:accounts[1]});
      })

      it("should return the proposal",async()=>{
        const data = await votingInstance.getOneProposal(1,{from:accounts[1]})
        expect(data.description).to.be.equal('prop');
        expect(data.voteCount).to.be.bignumber.equal(new BN(0));
      })
    })

    describe("addVoter() test",()=>{
      beforeEach(async()=>{
        votingInstance = await Voting.new({from:owner});
        await votingInstance.addVoter(accounts[1],{from:owner});
      })
      it("should revert if workflowStatus != RegisteringVoters",async()=>{
        await votingInstance.startProposalsRegistering();
        await expectRevert(votingInstance.addVoter(accounts[1],{from:owner}),"Voters registration is not open yet");
      })
      it("should revert is voter already registered",async()=>{
        await expectRevert(votingInstance.addVoter(accounts[1],{from:owner}),"Already registered");
      })
      it("should register a voter",async()=>{
        const data = await votingInstance.getVoter(accounts[1],{from:accounts[1]});
        expect(data.isRegistered).to.equal(true);
      })
      it("should emit the VoterRegistered event",async()=>{ 
        expectEvent(await votingInstance.addVoter(accounts[2],{from:owner}),"VoterRegistered",{voterAddress:accounts[2]});
      })
    })

    describe("addProposal() test",()=>{
      beforeEach(async()=>{
        votingInstance = await Voting.new({from:owner});
        await votingInstance.addVoter(accounts[1],{from:owner});
        await votingInstance.addVoter(accounts[2],{from:owner});
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('prop',{from:accounts[1]});
      })
      it("should revert if workflowStatus != WorkflowStatus.ProposalsRegistrationStarted",async()=>{
        await votingInstance.endProposalsRegistering({from:owner}); 
        await expectRevert(votingInstance.addProposal('prop2',{from:accounts[2]}),"Proposals are not allowed yet");
      })
      it("should revert if the proposal is empty",async()=>{
        await expectRevert(votingInstance.addProposal('',{from:accounts[2]}),"Vous ne pouvez pas ne rien proposer");
      })
      it("should add a proposal in proposalsArray",async()=>{
        await votingInstance.addProposal('prop2',{from:accounts[2]});
        const data = await votingInstance.getOneProposal(2,{from:accounts[2]});
        expect(data.description).to.be.equal('prop2');
      })
      it("should emit an 'ProposalRegistered' event",async()=>{
        expectEvent(await votingInstance.addProposal('prop2',{from:accounts[2]}),"ProposalRegistered",{proposalId:new BN(2)});
      })
    })

    describe("setVote() test",()=>{
      beforeEach(async()=>{
        votingInstance = await Voting.new({from:owner});
        await votingInstance.addVoter(accounts[1],{from:owner});
        await votingInstance.addVoter(accounts[2],{from:owner});
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('prop',{from:accounts[1]});
        await votingInstance.endProposalsRegistering();
        await votingInstance.startVotingSession({from:owner});
      })
      it("should revert if workflowStatus != WorkflowStatus.VotingSessionStarted",async()=>{
        await votingInstance.endVotingSession({from:owner}); 
        await expectRevert(votingInstance.setVote(1,{from:accounts[2]}),"Voting session havent started yet");
      })
      it("should revert if voter has already voted",async()=>{
        await votingInstance.setVote(1,{from:accounts[2]});
        await expectRevert(votingInstance.setVote(1,{from:accounts[2]}),"You have already voted")
      })
      it("should revert if proposal not found",async()=>{ 
        await expectRevert.unspecified(votingInstance.setVote(2,{from:accounts[2]}));
      })
      it("should update voter status : add votedProposalId and hasVoted=true",async()=>{
        await votingInstance.setVote(1,{from:accounts[2]});
        const data = await votingInstance.getVoter(accounts[2],{from:accounts[2]});
        expect(data.hasVoted).to.equal(true);
        expect(data.votedProposalId).to.be.bignumber.equal(new BN(1));
      })
      it("should add a vote to the proposal",async()=>{
        let proposal = await votingInstance.getOneProposal(1,{from:accounts[2]});
        expect(proposal.voteCount).to.be.bignumber.equal(new BN(0));
        await votingInstance.setVote(1,{from:accounts[2]});
        proposal = await votingInstance.getOneProposal(1,{from:accounts[2]});
        expect(proposal.voteCount).to.be.bignumber.equal(new BN(1));
      })
      it("should emit a Voted event",async()=>{
        expectEvent(await votingInstance.setVote(1,{from:accounts[2]}),"Voted",{voter:accounts[2],proposalId:new BN(1)});
      })
    })

  })

  describe(":::: STATE MODIFIERS TESTS ::::",()=>{
    beforeEach(async()=>{
      votingInstance = await Voting.new({from:owner});
    })
    describe("startProposalsRegistering() test",async()=>{
      it("should revert if workflowStatus != WorkflowStatus.RegisteringVoters",async()=>{
        await votingInstance.startProposalsRegistering({from:owner});
        await expectRevert(votingInstance.startProposalsRegistering({from:owner}),"Registering proposals cant be started now");
      })
      it("should change workflow status to ProposalsRegistrationStarted",async()=>{
        await votingInstance.startProposalsRegistering({from:owner});
        const workflowStatus = await votingInstance.workflowStatus.call();
        expect(workflowStatus).to.be.bignumber.equal(new BN(1));
      })
      it("should emit a WorkflowStatusChange event",async()=>{
        expectEvent(await votingInstance.startProposalsRegistering({from:owner}),"WorkflowStatusChange",{previousStatus:new BN(0),newStatus:new BN(1)});
      })
    })
    describe("endProposalsRegistering() test",async()=>{
      beforeEach(async()=>{
        await votingInstance.startProposalsRegistering({from:owner});
      })
      it("should revert if workflowStatus != WorkflowStatus.ProposalsRegistrationStarted",async()=>{
        await votingInstance.endProposalsRegistering({from:owner});
        await expectRevert(votingInstance.endProposalsRegistering({from:owner}),"Registering proposals havent started yet");
      })
      it("should change workflow status to ProposalsRegistrationEnded",async()=>{
        await votingInstance.endProposalsRegistering({from:owner});
        const workflowStatus = await votingInstance.workflowStatus.call();
        expect(workflowStatus).to.be.bignumber.equal(new BN(2));
      })
      it("should emit a WorkflowStatusChange event",async()=>{
        expectEvent(await votingInstance.endProposalsRegistering({from:owner}),"WorkflowStatusChange",{previousStatus:new BN(1),newStatus:new BN(2)});
      })
    })
    describe("startVotingSession() test",async()=>{
      beforeEach(async()=>{
        await votingInstance.startProposalsRegistering({from:owner});
        await votingInstance.endProposalsRegistering({from:owner});
      })
      it("should revert if workflowStatus != WorkflowStatus.ProposalsRegistrationEnded",async()=>{
        await votingInstance.startVotingSession({from:owner});
        await expectRevert(votingInstance.startVotingSession({from:owner}),"Registering proposals phase is not finished");
      })
      it("should change workflow status to VotingSessionStarted",async()=>{
        await votingInstance.startVotingSession({from:owner});
        const workflowStatus = await votingInstance.workflowStatus.call();
        expect(workflowStatus).to.be.bignumber.equal(new BN(3));
      })
      it("should emit a WorkflowStatusChange event",async()=>{
        expectEvent(await votingInstance.startVotingSession({from:owner}),"WorkflowStatusChange",{previousStatus:new BN(2),newStatus:new BN(3)});
      })
    })
    describe("endVotingSession() test",async()=>{
      beforeEach(async()=>{
        await votingInstance.startProposalsRegistering({from:owner});
        await votingInstance.endProposalsRegistering({from:owner});
        await votingInstance.startVotingSession({from:owner});
      })
      it("should revert if workflowStatus != WorkflowStatus.VotingSessionStarted",async()=>{
        await votingInstance.endVotingSession({from:owner});
        await expectRevert(votingInstance.endVotingSession({from:owner}),"Voting session havent started yet");
      })
      it("should change workflow status to VotingSessionEnded",async()=>{
        await votingInstance.endVotingSession({from:owner});
        const workflowStatus = await votingInstance.workflowStatus.call();
        expect(workflowStatus).to.be.bignumber.equal(new BN(4));
      })
      it("should emit a WorkflowStatusChange event",async()=>{
        expectEvent(await votingInstance.endVotingSession({from:owner}),"WorkflowStatusChange",{previousStatus:new BN(3),newStatus:new BN(4)});
      })
    })
    describe("tallyVote() test",async()=>{
      describe("tallyVote() status change test",async()=>{
        beforeEach(async()=>{
          await votingInstance.startProposalsRegistering({from:owner});
          await votingInstance.endProposalsRegistering({from:owner});
          await votingInstance.startVotingSession({from:owner});
          await votingInstance.endVotingSession({from:owner});
        })
        it("should revert if workflowStatus != WorkflowStatus.VotingSessionEnded",async()=>{
          await votingInstance.tallyVotes({from:owner});
          await expectRevert(votingInstance.tallyVotes({from:owner}),"Current status is not voting session ended");
        })
        it("should change workflow status to VotesTallied",async()=>{
          await votingInstance.tallyVotes({from:owner});
          const workflowStatus = await votingInstance.workflowStatus.call();
          expect(workflowStatus).to.be.bignumber.equal(new BN(5));
        })
        it("should emit a WorkflowStatusChange event",async()=>{
          expectEvent(await votingInstance.tallyVotes({from:owner}),"WorkflowStatusChange",{previousStatus:new BN(4),newStatus:new BN(5)});
        })
      })
      describe("tallyVote() winning proposal return",async()=>{
        it("should return the winning proposalId",async()=>{
        await votingInstance.addVoter(accounts[1],{from:owner});
        await votingInstance.addVoter(accounts[2],{from:owner});
        await votingInstance.addVoter(accounts[3],{from:owner});
        await votingInstance.startProposalsRegistering({from:owner});
        await votingInstance.addProposal('prop',{from:accounts[1]});
        await votingInstance.addProposal('prop2',{from:accounts[2]});
        await votingInstance.endProposalsRegistering({from:owner});
        await votingInstance.startVotingSession({from:owner});
        await votingInstance.setVote(1,{from:accounts[1]});
        await votingInstance.setVote(1,{from:accounts[2]});
        await votingInstance.setVote(2,{from:accounts[3]});
        await votingInstance.endVotingSession({from:owner});
        await votingInstance.tallyVotes({from:owner});
        const data = await votingInstance.winningProposalID.call();
        expect(data).to.be.bignumber.equal(new BN(1));
          
        })
      })
    })
  })
});
