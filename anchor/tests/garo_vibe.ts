import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GaroVibe } from "../target/types/garo_vibe";
import { expect } from "chai";
import { Keypair, SystemProgram, PublicKey } from "@solana/web3.js";

describe("garo_vibe", () => {
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.GaroVibe as Program<GaroVibe>;
    const user = Keypair.generate();

    // Derive PDA for attendee record
    const [attendeePda, attendeeBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("attendee"), user.publicKey.toBuffer()],
        program.programId
    );

    before(async () => {
        // Airdrop SOL to the test user
        const signature = await provider.connection.requestAirdrop(
            user.publicKey,
            2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(signature);
    });

    describe("init_attendee", () => {
        it("should initialize a new attendee record", async () => {
            const tx = await program.methods
                .initAttendee()
                .accounts({
                    user: user.publicKey,
                    attendeeRecord: attendeePda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([user])
                .rpc();

            console.log("Init attendee tx:", tx);

            // Fetch the account
            const attendee = await program.account.attendeeRecord.fetch(attendeePda);

            expect(attendee.owner.toBase58()).to.equal(user.publicKey.toBase58());
            expect(attendee.attendanceCount).to.equal(0);
            expect(attendee.tier).to.equal(1);
            expect(attendee.lastEventId).to.equal("");
            expect(attendee.bump).to.equal(attendeeBump);
        });
    });

    describe("mint_por_token", () => {
        const eventId = "ROOF_SESSION_001";
        const mockQrSignature = new Uint8Array(64).fill(0); // Mock signature

        it("should mint a Proof of Rave token for first event", async () => {
            const tx = await program.methods
                .mintPorToken(eventId, Array.from(mockQrSignature))
                .accounts({
                    user: user.publicKey,
                    attendeeRecord: attendeePda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([user])
                .rpc();

            console.log("Mint PoR tx:", tx);

            const attendee = await program.account.attendeeRecord.fetch(attendeePda);

            expect(attendee.attendanceCount).to.equal(1);
            expect(attendee.tier).to.equal(1); // Still Tier 1 (Vibe Check)
            expect(attendee.lastEventId).to.equal(eventId);
        });

        it("should reject duplicate claim for same event", async () => {
            try {
                await program.methods
                    .mintPorToken(eventId, Array.from(mockQrSignature))
                    .accounts({
                        user: user.publicKey,
                        attendeeRecord: attendeePda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([user])
                    .rpc();

                expect.fail("Should have thrown AlreadyClaimed error");
            } catch (err: any) {
                expect(err.error.errorCode.code).to.equal("AlreadyClaimed");
            }
        });

        it("should evolve tier after multiple events", async () => {
            // Simulate attending multiple events
            const events = [
                "ROOF_SESSION_002",
                "STUDIO_NIGHT_001",
                "ROOF_SESSION_003",
                "FESTIVAL_2024",
            ];

            for (const evtId of events) {
                await program.methods
                    .mintPorToken(evtId, Array.from(mockQrSignature))
                    .accounts({
                        user: user.publicKey,
                        attendeeRecord: attendeePda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([user])
                    .rpc();
            }

            const attendee = await program.account.attendeeRecord.fetch(attendeePda);

            expect(attendee.attendanceCount).to.equal(5);
            expect(attendee.tier).to.equal(5); // Should be Tier 5 (Regular)
            console.log("🎧 User evolved to Tier 5: Regular!");
        });

        it("should reach GΛRO Family status (Tier 10) after 10 events", async () => {
            const moreEvents = [
                "ROOF_SESSION_004",
                "ROOF_SESSION_005",
                "STUDIO_NIGHT_002",
                "STUDIO_NIGHT_003",
                "NEW_YEARS_2025",
            ];

            for (const evtId of moreEvents) {
                await program.methods
                    .mintPorToken(evtId, Array.from(mockQrSignature))
                    .accounts({
                        user: user.publicKey,
                        attendeeRecord: attendeePda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([user])
                    .rpc();
            }

            const attendee = await program.account.attendeeRecord.fetch(attendeePda);

            expect(attendee.attendanceCount).to.equal(10);
            expect(attendee.tier).to.equal(10); // GΛRO Family!
            console.log("🌀 Welcome to the GΛRO Family! Tier 10 achieved!");
        });
    });
});
