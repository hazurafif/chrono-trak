# Security Specifications

## 1. Data Invariants
- Each Milestone must belong to the user (`userId` matching `request.auth.uid`).
- Strict validation of string lengths: `title` and `category` must be bounded.
- The `color` and `unitPreference` must conform strictly to predefined enum lists.
- Users must have standard email-verified Google auth tokens (`request.auth.token.email_verified == true`).
- Temporal integrity: `createdAt` is immutable and must equal `request.time` on draft insertion; `updatedAt` must equal `request.time` on draft update.

## 2. The Dirty Dozen Payloads
1. **Unauthenticated Creation**: Payload sent with no auth token. Expected: `PERMISSION_DENIED`.
2. **Identity Spoofing**: Signed in as `userA` but setting `userId` to `userB` in the document. Expected: `PERMISSION_DENIED`.
3. **Unverified Email**: Authenticated but `email_verified == false`. Expected: `PERMISSION_DENIED`.
4. **Junk ID Poisoning**: Trying to create milestone with ID representing huge invalid strings. Expected: `PERMISSION_DENIED`.
5. **Ghost Field Mutation**: Sending extra property `internalField: "admin"` in creation. Expected: `PERMISSION_DENIED`.
6. **Immutable Field Mutate**: Changing `createdAt` or standard `userId` during an update call. Expected: `PERMISSION_DENIED`.
7. **Invalid Enum Range**: Setting color variant to `neon_laser`. Expected: `PERMISSION_DENIED`.
8. **Negative Date Invariant**: Try inserting arbitrary objects inside date shapes. Expected: `PERMISSION_DENIED`.
9. **Global Collection Access Leak**: Authenticated as `userA` attempting read on `/users/userB/milestones/someId`. Expected: `PERMISSION_DENIED`.
10. **Huge Title Blowout**: Payload with title size of 100K characters. Expected: `PERMISSION_DENIED`.
11. **Improper Sorting List queries**: Attempting `list` query on milestones without `where("userId", "==", request.auth.uid)`. Expected: `PERMISSION_DENIED`.
12. **Self-Elevated Roles**: Trying to mutate properties that map to roles or access control. Expected: `PERMISSION_DENIED`.
