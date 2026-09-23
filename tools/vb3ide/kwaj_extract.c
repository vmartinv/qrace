/*
 * Batch-decompresses the KWAJ-compressed installer files (*.EX_, *.DL_,
 * etc.) found on the VB3 setup disks, using libmspack. This is how the VB3
 * IDE (VB.EXE) itself was obtained for Phase 3 empirical opcode research --
 * see docs/pcode-notes.md. No installer run was needed at all: VB.EXE only
 * needs VBRUN300.DLL alongside it to run directly under Wine.
 *
 * These KWAJ files don't carry an embedded real filename (no HASFILENAME
 * header), so output names are just the input name with the trailing '_'
 * dropped (e.g. VB.EX_ -> VB.EX) -- rename manually as needed (VB.EX ->
 * VB.EXE, VBRUN300.DL -> VBRUN300.DLL, etc).
 *
 * Build:   gcc kwaj_extract.c -o kwaj_extract -lmspack
 * Usage:   ./kwaj_extract <dir-of-compressed-disk-files> <output-dir>
 */
#include <mspack.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <dirent.h>

int main(int argc, char **argv) {
    if (argc != 3) {
        fprintf(stderr, "usage: %s <indir> <outdir>\n", argv[0]);
        return 2;
    }
    const char *indir = argv[1];
    const char *outdir = argv[2];
    mkdir(outdir, 0755);

    struct mskwaj_decompressor *kwajd = mspack_create_kwaj_decompressor(NULL);
    if (!kwajd) {
        fprintf(stderr, "could not create kwaj decompressor\n");
        return 1;
    }

    DIR *d = opendir(indir);
    if (!d) { perror("opendir"); return 1; }
    struct dirent *ent;
    int ok = 0, fail = 0, skip = 0;
    while ((ent = readdir(d)) != NULL) {
        size_t len = strlen(ent->d_name);
        if (len < 2 || ent->d_name[len-1] != '_') { skip++; continue; }
        char inpath[4096];
        snprintf(inpath, sizeof(inpath), "%s/%s", indir, ent->d_name);

        struct mskwajd_header *hdr = kwajd->open(kwajd, inpath);
        if (!hdr) {
            fprintf(stderr, "open failed: %s (err %d)\n", ent->d_name, kwajd->last_error(kwajd));
            fail++;
            continue;
        }
        char outname[512];
        if (hdr->filename && hdr->filename[0]) {
            snprintf(outname, sizeof(outname), "%s", hdr->filename);
        } else {
            snprintf(outname, sizeof(outname), "%s", ent->d_name);
            outname[strlen(outname)-1] = '\0'; /* best-effort, drop trailing _ */
        }
        char outpath[4096];
        snprintf(outpath, sizeof(outpath), "%s/%s", outdir, outname);

        int rc = kwajd->extract(kwajd, hdr, outpath);
        if (rc != MSPACK_ERR_OK) {
            fprintf(stderr, "extract failed: %s -> %s (err %d)\n", ent->d_name, outname, rc);
            fail++;
        } else {
            printf("%s -> %s\n", ent->d_name, outname);
            ok++;
        }
        kwajd->close(kwajd, hdr);
    }
    closedir(d);
    mspack_destroy_kwaj_decompressor(kwajd);
    fprintf(stderr, "\nok=%d fail=%d skip=%d\n", ok, fail, skip);
    return 0;
}
