use anchor_lang::prelude::*;

declare_id!("GVibe11111111111111111111111111111111111111");

#[program]
pub mod garo_vibe {
    use super::*;

    /// Mint a "Proof of Rave" token to validate event attendance.
    /// This function is called after QR validation (off-chain signature).
    pub fn mint_por_token(
        ctx: Context<MintPorToken>,
        event_id: String,
        qr_signature: [u8; 64],
    ) -> Result<()> {
        let attendee = &mut ctx.accounts.attendee_record;
        let clock = Clock::get()?;

        // Verify the attendee hasn't already claimed for this event
        require!(
            attendee.last_event_id != event_id,
            GaroError::AlreadyClaimed
        );

        // Update attendee record
        attendee.owner = ctx.accounts.user.key();
        attendee.attendance_count += 1;
        attendee.last_event_id = event_id.clone();
        attendee.last_timestamp = clock.unix_timestamp;
        attendee.tier = calculate_tier(attendee.attendance_count);

        // Emit event for indexing
        emit!(RaveProofMinted {
            user: ctx.accounts.user.key(),
            event_id,
            new_tier: attendee.tier,
            total_attendance: attendee.attendance_count,
            timestamp: clock.unix_timestamp,
        });

        msg!("🎧 PROOF OF RAVE minted! Tier: {} | Attendance: {}", 
            attendee.tier, attendee.attendance_count);

        Ok(())
    }

    /// Initialize a new attendee record (first-time ravers)
    pub fn init_attendee(ctx: Context<InitAttendee>) -> Result<()> {
        let attendee = &mut ctx.accounts.attendee_record;
        attendee.owner = ctx.accounts.user.key();
        attendee.attendance_count = 0;
        attendee.tier = 1;
        attendee.last_event_id = String::new();
        attendee.last_timestamp = 0;
        attendee.bump = ctx.bumps.attendee_record;

        msg!("🌀 Welcome to the GΛRO Family!");
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct MintPorToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"attendee", user.key().as_ref()],
        bump = attendee_record.bump,
    )]
    pub attendee_record: Account<'info, AttendeeRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitAttendee<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + AttendeeRecord::INIT_SPACE,
        seeds = [b"attendee", user.key().as_ref()],
        bump,
    )]
    pub attendee_record: Account<'info, AttendeeRecord>,

    pub system_program: Program<'info, System>,
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

#[account]
#[derive(InitSpace)]
pub struct AttendeeRecord {
    pub owner: Pubkey,           // Wallet owner
    pub attendance_count: u16,   // Total events attended
    pub tier: u8,                // Current tier (1-10)
    #[max_len(64)]
    pub last_event_id: String,   // Last claimed event
    pub last_timestamp: i64,     // Unix timestamp of last claim
    pub bump: u8,                // PDA bump
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

#[event]
pub struct RaveProofMinted {
    pub user: Pubkey,
    pub event_id: String,
    pub new_tier: u8,
    pub total_attendance: u16,
    pub timestamp: i64,
}

// ═══════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum GaroError {
    #[msg("Already claimed Proof of Rave for this event")]
    AlreadyClaimed,
    #[msg("Invalid QR signature")]
    InvalidSignature,
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/// Calculate tier based on attendance count
/// Tier 1: 0-1 events (Vibe Check)
/// Tier 5: 5+ events (Regular)
/// Tier 10: 10+ events (GΛRO Family)
fn calculate_tier(attendance: u16) -> u8 {
    match attendance {
        0..=1 => 1,
        2..=4 => 2,
        5..=6 => 5,
        7..=9 => 7,
        _ => 10,
    }
}
