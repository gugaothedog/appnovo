# Security Specification for Receitas de Casa (Firebase)

## 1. Data Invariants
- **Identity Integrity**: A user can only write their own user profile document (`/users/{userId}`). No user can spoof another user's profile.
- **Relational Integrity**: A user can only create, update, or delete recipes where and `authorId` matches their authenticated `uid`.
- **System-only fields**: Admin flags (`isAdmin`) or account system roles cannot be modified by standard users.
- **Timestamp Integrity**: All `createdAt` and `updatedAt` properties must strictly match `request.time`.
- **Comment Access Control**: Anyone who is signed in can comment, but they can only delete their own comment or if they are the admin.
- **Favorite Syncing**: Users can only create or delete their own favorite configurations.

## 2. The "Dirty Dozen" Payloads (Vulnerabilities Blocked)
1. **User Spoofing**: Registering/Updating profile under a different `userId` or with someone else's email.
2. **Privilege Escalation**: Attempting to write `isAdmin: true` inside own profile.
3. **Recipe Theft / Impersonation**: Creating a recipe with `authorId` pointing to another user.
4. **Anomalous Field Injection**: Injecting a "ghost field" into a recipe update block, like `isVerifiedBySystem: true`.
5. **Ghost Likes / Modification**: Updating another user's recipe to inject random fields.
6. **Immutable Field Tampering**: Modifying the immutable `createdAt` or `authorId` on an existing recipe.
7. **Junk ID Poisoning**: Creating a recipe or user with a 10KB string of junk characters as a Document ID.
8. **PII Data Scraping**: Attempting a blanket query/list on `/users` without scoping it.
9. **Spam Comments**: Commenting on behalf of someone else or creating a comments document with no recipe reference.
10. **Malicious Delete**: Trying to delete someone else's recipe.
11. **Favorite Spoofing**: Creating a favorite mapping on behalf of another user's `userId`.
12. **Malicious Comment Deletion**: Normal user trying to delete comments they did not write.
